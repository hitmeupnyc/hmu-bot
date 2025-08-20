import { Effect } from 'effect';
import { Request } from 'express';
import {
  effectMiddleware,
  extractHeaders,
} from '../services/effect/adapters/middlewareAdapter';
import {
  Action,
  AuthorizationError,
  Subject,
} from '../services/effect/AuthorizationEffects';
import {
  AuthenticationError,
  AuthService,
  MiddlewareContext,
} from '../services/effect/AuthService';
import { AuthLayer } from '../services/effect/layers/AuthLayer';

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
export const requireAuth = (req: Request) =>
  Effect.gen(function* () {
    const authService = yield* AuthService;
    const headers = extractHeaders(req);

    const session = yield* authService.validateSession(headers);

    return {
      session,
      user: {
        id: session.user.id,
        email: session.user.email,
      },
    } satisfies MiddlewareContext;
  }).pipe(
    Effect.provide(AuthLayer),
    Effect.catchTag('ConfigError', (error) =>
      Effect.fail(
        new AuthenticationError({
          reason: 'auth_service_error',
          message: 'Authentication service configuration error',
          cause: error,
        })
      )
    )
  );

/**
 * Middleware factory to check if user has specific CASL permission
 * Must be used after requireAuth
 */
export const requirePermission = (
  action: Action,
  subject: Subject | ((req: Request) => Subject | object),
  field?: string
) => {
  return effectMiddleware(
    (req: Request) =>
      Effect.gen(function* () {
        if (!req.session) {
          return yield* Effect.fail(
            new AuthorizationError({
              cause: 'no session found',
              reason: 'permission_denied',
              message: 'Authentication required - no session found',
            })
          );
        }

        const authService = yield* AuthService;
        const subjectObj =
          typeof subject === 'function' ? subject(req) : subject;

        const hasPermission = yield* authService.checkPermission(
          req.session,
          action,
          subjectObj,
          field
        );

        if (!hasPermission) {
          return yield* Effect.fail(
            new AuthorizationError({
              cause: 'permission_denied',
              reason: 'permission_denied',
              message: `Permission denied: ${action} on ${JSON.stringify(subjectObj)}`,
              requiredPermission: `${action} on ${JSON.stringify(subjectObj)}`,
            })
          );
        }

        return {
          session: req.session,
          user: req.user,
        } satisfies MiddlewareContext;
      }).pipe(
        Effect.provide(AuthLayer),
        Effect.catchTag('ConfigError', (error) =>
          Effect.fail(
            new AuthorizationError({
              cause: error,
              reason: 'permission_denied',
              message: 'Authorization service configuration error',
            })
          )
        )
      ),
    {
      spanName: 'require-permission',
      timeout: '3 seconds',
    }
  );
};

/**
 * Resource-based permission middleware with flag support
 */
interface ResourcePermissionOptions {
  resourceType: string;
  resourceIdParam?: string;
  permission: string;
  requiredFlags?: string[];
}

export const requireResourcePermission = (
  options: ResourcePermissionOptions
) => {
  return effectMiddleware(
    (req: Request) =>
      Effect.gen(function* () {
        if (!req.session) {
          return yield* Effect.fail(
            new AuthorizationError({
              cause: 'no session found',
              reason: 'permission_denied',
              message: 'Authentication required - no session found',
            })
          );
        }

        const resourceId = options.resourceIdParam
          ? req.params[options.resourceIdParam]
          : req.params.id;

        if (!resourceId) {
          return yield* Effect.fail(
            new AuthorizationError({
              reason: 'permission_denied',
              message: 'Resource ID required',
              resource: options.resourceType + ':' + 'missing',
              cause: 'resource_not_found',
            })
          );
        }

        const authService = yield* AuthService;

        const hasPermission = yield* authService.checkResourcePermission(
          req.session,
          options.resourceType,
          resourceId,
          options.permission,
          options.requiredFlags
        );

        if (!hasPermission) {
          return yield* Effect.fail(
            new AuthorizationError({
              reason: 'permission_denied',
              message: 'Resource permission denied',
              requiredPermission: options.permission,
              resource: options.resourceType + ':' + resourceId,
              cause: 'permission_denied',
            })
          );
        }

        return {
          session: req.session,
          user: req.user,
        } as MiddlewareContext;
      }).pipe(
        Effect.provide(AuthLayer),
        Effect.catchTag('ConfigError', (error) =>
          Effect.fail(
            new AuthorizationError({
              cause: error,
              reason: 'permission_denied',
              message: 'Authorization service configuration error',
            })
          )
        )
      ),
    {
      spanName: 'permission-middleware',
      timeout: '3 seconds',
    }
  );
};

// Convenience middleware combinations
export const requireVerified = requireResourcePermission({
  resourceType: 'members',
  permission: 'read',
  requiredFlags: ['socials_approved', 'video_verified'],
});

export const requireVolunteer = requireResourcePermission({
  resourceType: 'events',
  permission: 'read',
  requiredFlags: ['guardian_certified'],
});

export const requireAdminAccess = requirePermission('read', 'all');

export const requireEventManagerAccess = requirePermission('read', 'events');

export const requireMemberManagerAccess = requirePermission('read', 'members');
