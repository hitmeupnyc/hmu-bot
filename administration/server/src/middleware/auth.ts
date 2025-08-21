import { Effect, Layer } from 'effect';
import { NextFunction, Request, Response } from 'express';
import { transformError } from '~/services/effect/adapters/errorResponseBuilder';
import { withRequestObservability } from '~/services/effect/adapters/observabilityUtils';
import {
  Action,
  AuthorizationService,
  Subject,
} from '~/services/effect/AuthorizationEffects';
import { Auth, AuthLive } from '~/services/effect/layers/AuthLayer';
import { FlagLive } from '~/services/effect/layers/FlagLayer';

// Extend Express Request type to include session
declare global {
  namespace Express {
    interface Request {
      session?: {
        user: {
          id: string;
          email: string;
          name: string;
        };
        id: string;
        userId: string;
        expiresAt: Date;
      };
      permissionResult?: {
        allowed: boolean;
        reason?: string;
      };
    }
  }
}

export const extractHeaders = (
  req: Request
): Record<string, string | string[] | undefined> => {
  return req.headers as Record<string, string | string[] | undefined>;
};

/**
 * Middleware to require authentication for routes
 * Checks for a valid session and attaches it to the request
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const effect = Effect.gen(function* () {
    const authService = yield* Auth;
    const session = yield* authService.validateSession(extractHeaders(req));

    // Attach context to request
    if (session) {
      req.session = session;
    }
    next();
  }).pipe(
    Effect.provide(AuthLive),
    withRequestObservability('require-auth', req)
  );
  try {
    await Effect.runPromise(effect);
  } catch (error) {
    // Only send response if headers haven't been sent already
    if (!res.headersSent) {
      const errorResponse = transformError(error);
      return res.status(errorResponse.status).json(errorResponse.body);
    }
    return Promise.resolve();
  }
};

/**
 * Middleware factory to check if user has specific CASL permission
 * Must be used after requireAuth
 */
export const requirePermission =
  (
    action: Action,
    subject: Subject | ((req: Request) => Subject),
    field?: string
  ) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await Effect.runPromise(
        Effect.gen(function* () {
          const authorizationService = yield* AuthorizationService;

          // Check basic resource permission first
          const hasPermission =
            req.session &&
            (yield* authorizationService
              .checkPermission(
                req.session.userId,
                action,
                typeof subject === 'function' ? subject(req) : subject,
                field
              )
              .pipe(Effect.catchAll(() => Effect.succeed(false))));

          req.permissionResult = hasPermission
            ? { allowed: true }
            : { allowed: false, reason: 'permission_denied' };

          if (!hasPermission) {
            throw new Error('Permission denied');
          }
        }).pipe(
          withRequestObservability('require-permission', req),
          Effect.provide(Layer.mergeAll(AuthorizationService.Live, FlagLive))
        )
      );
      return next();
    } catch (error) {
      if (!res.headersSent) {
        const errorResponse = transformError(error);
        return res.status(errorResponse.status).json(errorResponse.body);
      }
    }
  };
