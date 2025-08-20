import { Duration, Effect, Schedule, identity } from 'effect';
import { TimeoutException } from 'effect/Cause';
import { NextFunction, Request, Response } from 'express';
import {
  AuthenticationError,
  MiddlewareContext,
  SessionValidationError,
} from '../AuthService';
import { AuthorizationError } from '../AuthorizationEffects';

// HTTP Response helpers with structured error mapping
const createErrorResponse = <T extends any>(error: T) => {
  if (error instanceof AuthenticationError) {
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
  }

  if (error instanceof AuthorizationError) {
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
      default:
        return {
          status: 403,
          body: {
            error: 'Access denied',
            code: 'AUTHORIZATION_ERROR',
          },
        };
    }
  }

  if (error instanceof SessionValidationError) {
    return {
      status: 401,
      body: {
        error: 'Session validation failed',
        code: 'SESSION_VALIDATION_ERROR',
      },
    };
  }

  if (error instanceof TimeoutException) {
    return {
      status: 504,
      body: {
        error: 'Request timed out',
        code: 'REQUEST_TIMEOUT',
      },
    };
  }

  return {
    status: 500,
    body: {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  };
};

// Effect middleware adapter with observability and resilience
export const effectMiddleware = <E>(
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
            error: error,
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

// Utility for extracting headers safely
export const extractHeaders = (
  req: Request
): Record<string, string | string[] | undefined> => {
  return req.headers as Record<string, string | string[] | undefined>;
};
