import { Cause, Duration, Effect, Schedule, identity } from 'effect';
import { NextFunction, Request, Response } from 'express';
import {
  AuthenticationError,
  AuthorizationError,
  MiddlewareContext,
  SessionValidationError,
} from '../AuthService';

// HTTP Response helpers with structured error mapping
const createErrorResponse = (
  error:
    | AuthenticationError
    | AuthorizationError
    | SessionValidationError
    | Cause.TimeoutException
) => {
  switch (error._tag) {
    case 'AuthenticationError':
      switch (error.reason) {
        case 'missing_session':
        case 'invalid_session':
        case 'expired_session':
          return {
            status: 401,
            body: {
              error: error.message,
              code: 'UNAUTHENTICATED',
              reason: error.reason,
            },
          };
        case 'auth_service_error':
          return {
            status: 500,
            body: {
              error: 'Authentication service error',
              code: 'AUTH_SERVICE_ERROR',
            },
          };
        default:
          return {
            status: 401,
            body: {
              error: 'Authentication required',
              code: 'UNAUTHENTICATED',
            },
          };
      }

    case 'AuthorizationError':
      switch (error.reason) {
        case 'permission_denied':
          return {
            status: 403,
            body: {
              error: error.message,
              code: 'PERMISSION_DENIED',
              requiredPermission: error.requiredPermission,
              resource: error.resource,
            },
          };
        case 'missing_flag':
          return {
            status: 403,
            body: {
              error: error.message,
              code: 'MISSING_FLAG',
              missingFlag: error.missingFlag,
            },
          };
        case 'resource_not_found':
          return {
            status: 404,
            body: {
              error: error.message,
              code: 'RESOURCE_NOT_FOUND',
              resource: error.resource,
            },
          };
        default:
          return {
            status: 403,
            body: {
              error: 'Access denied',
              code: 'AUTHORIZATION_ERROR',
            },
          };
      }

    case 'SessionValidationError':
      return {
        status: 401,
        body: {
          error: 'Session validation failed',
          code: 'SESSION_VALIDATION_ERROR',
        },
      };

    case 'TimeoutException':
      return {
        status: 504,
        body: {
          error: 'Request timed out',
          code: 'REQUEST_TIMEOUT',
        },
      };

    default:
      return {
        status: 500,
        body: {
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
      };
  }
};

// Effect middleware adapter with observability and resilience
export const effectMiddleware = <
  E extends
    | AuthenticationError
    | AuthorizationError
    | SessionValidationError
    | Cause.TimeoutException,
>(
  effectOperation: (req: Request) => Effect.Effect<MiddlewareContext, E, never>,
  options: {
    spanName: string;
    retryPolicy?: Schedule.Schedule<any>;
    timeout?: Duration.DurationInput;
  } = {
    spanName: 'middleware-operation',
    retryPolicy: Schedule.intersect(
      Schedule.exponential('100 millis'),
      Schedule.recurs(3)
    ),
  }
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    const pipeline = effectOperation(req).pipe(
      // Add observability
      Effect.withSpan(options.spanName, {
        attributes: {
          method: req.method,
          path: req.path,
          userAgent: req.get('User-Agent'),
        },
      }),

      // Add timeout protection
      options.timeout ? Effect.timeout(options.timeout) : identity,
      options.retryPolicy ? Effect.retry(options.retryPolicy) : identity,

      // Handle success and errors with structured responses
      Effect.match({
        onFailure: (error) => {
          const duration = Date.now() - startTime;

          // Log structured error
          console.error('Middleware operation failed', {
            operation: options.spanName,
            error: error._tag,
            reason: 'reason' in error ? error.reason : undefined,
            duration,
            path: req.path,
            method: req.method,
          });

          // Send structured error response
          const response = createErrorResponse(error);
          res.status(response.status).json(response.body);
        },

        onSuccess: (context) => {
          const duration = Date.now() - startTime;
          // Attach context to request
          if (context.session) {
            req.session = context.session;
          }
          if (context.user) {
            req.user = context.user;
          }

          // Log successful operation
          console.log('Middleware operation succeeded', {
            operation: options.spanName,
            userId: context.session?.userId,
            duration,
            path: req.path,
            method: req.method,
          });

          next();
        },
      })
    );
    Effect.runSync(pipeline);
  };
};

// Specialized middleware adapters for common patterns
export const authMiddleware = (
  authOperation: (
    req: Request
  ) => Effect.Effect<MiddlewareContext, AuthenticationError, never>
) =>
  effectMiddleware(authOperation, {
    spanName: 'auth-middleware',
    timeout: '5 seconds',
    retryPolicy: Schedule.exponential('100 millis').pipe(
      Schedule.intersect(Schedule.recurs(2))
    ),
  });

export const permissionMiddleware = (
  permissionOperation: (
    req: Request
  ) => Effect.Effect<MiddlewareContext, AuthorizationError, never>
) =>
  effectMiddleware(permissionOperation, {
    spanName: 'permission-middleware',
    timeout: '3 seconds',
  });

// Utility for extracting headers safely
export const extractHeaders = (
  req: Request
): Record<string, string | string[] | undefined> => {
  return req.headers as Record<string, string | string[] | undefined>;
};
