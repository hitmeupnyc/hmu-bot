import { TimeoutException } from 'effect/Cause';
import { AuthorizationError } from '~/services/effect/AuthorizationEffects';
import {
  ConnectionError,
  DatabaseError,
  NotFoundError,
  ParseError,
  TransactionError,
  UniqueError,
} from '~/services/effect/errors/CommonErrors';
import {
  AuthenticationError,
  SessionValidationError,
} from '~/services/effect/layers/AuthLayer';
import { FlagError } from '~/services/effect/layers/FlagLayer';

export interface HTTPErrorResponse {
  status: number;
  body: {
    error: string;
    code: string;
    reason?: string;
    requiredPermission?: string;
    resource?: { type: string; id: string };
    field?: string;
    value?: string;
  };
}

export interface HTTPErrorResult {
  response: HTTPErrorResponse;
  status: number;
}

/**
 * Unified error response builder for Effect adapters
 * Handles both direct JSON responses (middleware) and Express Error objects (routes)
 */
export const transformError = (error: unknown): HTTPErrorResponse => {
  let response: HTTPErrorResponse;

  if (error instanceof AuthenticationError) {
    switch (error.reason) {
      case 'missing_session':
      case 'invalid_session':
      case 'expired_session':
        response = {
          status: 401,
          body: {
            error: error.message,
            code: 'UNAUTHENTICATED',
            reason: error.reason,
          },
        };
        break;
      case 'auth_service_error':
        response = {
          status: 500,
          body: {
            error: 'Authentication service error',
            code: 'AUTH_SERVICE_ERROR',
          },
        };
        break;
      default:
        response = {
          status: 401,
          body: {
            error: 'Authentication required',
            code: 'UNAUTHENTICATED',
          },
        };
    }
  } else if (error instanceof AuthorizationError) {
    switch (error.reason) {
      case 'permission_denied':
        response = {
          status: 403,
          body: {
            error: error.message,
            code: 'PERMISSION_DENIED',
            requiredPermission: error.requiredPermission,
            resource: { type: error.resource || '', id: '' },
          },
        };
        break;
      default:
        response = {
          status: 403,
          body: {
            error: 'Access denied',
            code: 'AUTHORIZATION_ERROR',
          },
        };
    }
  } else if (error instanceof SessionValidationError) {
    response = {
      status: 401,
      body: {
        error: 'Session validation failed',
        code: 'SESSION_VALIDATION_ERROR',
      },
    };
  } else if (error instanceof NotFoundError) {
    response = {
      status: 404,
      body: {
        error: `Not found: ${error.id}#${error.resource}`,
        code: 'NOT_FOUND',
        resource: { type: error.resource, id: error.id },
      },
    };
  } else if (error instanceof UniqueError) {
    response = {
      status: 409,
      body: {
        error: `${error.field} already exists: ${error.value}`,
        code: 'UNIQUE_CONSTRAINT_VIOLATION',
        field: error.field,
        value: error.value,
      },
    };
  } else if (error instanceof ParseError) {
    response = {
      status: 400,
      body: {
        error: `Validation error: ${error.message}`,
        code: 'VALIDATION_ERROR',
      },
    };
  } else if (error instanceof FlagError) {
    // Handle specific flag error cases
    if (error.message.includes('not found')) {
      response = {
        status: 404,
        body: {
          error: error.message,
          code: 'FLAG_NOT_FOUND',
        },
      };
    } else if (
      error.message.includes('invalid') ||
      error.message.includes('required')
    ) {
      response = {
        status: 400,
        body: {
          error: error.message,
          code: 'FLAG_VALIDATION_ERROR',
        },
      };
    } else {
      response = {
        status: 500,
        body: {
          error: error.message,
          code: 'FLAG_ERROR',
        },
      };
    }
  } else if (
    error instanceof DatabaseError ||
    error instanceof ConnectionError ||
    error instanceof TransactionError
  ) {
    response = {
      status: 500,
      body: {
        error: `Database error: ${error.message}`,
        code: 'DATABASE_ERROR',
      },
    };
  } else if (error instanceof TimeoutException) {
    response = {
      status: 504,
      body: {
        error: 'Request timed out',
        code: 'REQUEST_TIMEOUT',
      },
    };
  } else {
    // Generic error handling
    response = {
      status: 500,
      body: {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    };
  }

  return response;
};
