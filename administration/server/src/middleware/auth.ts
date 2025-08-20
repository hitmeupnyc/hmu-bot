import { Effect, Layer } from 'effect';
import { Request } from 'express';
import {
  effectMiddleware,
  extractHeaders,
} from '~/services/effect/adapters/middlewareAdapter';
import {
  Action,
  AuthorizationService,
  Subject,
} from '~/services/effect/AuthorizationEffects';
import { AuthService, MiddlewareContext } from '~/services/effect/AuthService';
import { FlagService } from '~/services/effect/FlagService';
import { FlagServiceLive } from '~/services/effect/FlagServiceLive';
import { AuthLayer } from '~/services/effect/layers/AuthLayer';

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
      user?: {
        id: string;
        email: string;
        flags?: string[];
      };
    }
  }
}

/**
 * Middleware to require authentication for routes
 * Checks for a valid session and attaches it to the request
 */
export const requireAuth = effectMiddleware((req: Request) =>
  Effect.gen(function* () {
    const authService = yield* AuthService;
    const session = yield* authService.validateSession(extractHeaders(req));

    return { session } satisfies MiddlewareContext;
  }).pipe(Effect.provide(AuthLayer), Effect.withSpan('require-auth'))
);

/**
 * Middleware factory to check if user has specific CASL permission
 * Must be used after requireAuth
 */
export const requirePermission = (
  action: Action,
  subject: Subject | ((req: Request) => Subject),
  field?: string
) => {
  return effectMiddleware<never>((req: Request) =>
    Effect.gen(function* () {
      const flagService = yield* FlagService;
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

      return {
        session: req.session,
        permissionResult: hasPermission
          ? { allowed: true }
          : { allowed: false, reason: 'permission_denied' },
      } satisfies MiddlewareContext;
    }).pipe(
      Effect.withSpan('require-permission'),
      Effect.provide(Layer.mergeAll(AuthorizationService.Live, FlagServiceLive))
    )
  );
};
