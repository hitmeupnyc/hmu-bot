/**
 * Auth API endpoints using @effect/platform HttpApi
 * Pass-through endpoints for Better Auth integration
 */

import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from '@effect/platform';
import { Schema } from 'effect';

// Common error schemas for auth operations
class AuthenticationError extends Schema.TaggedError<AuthenticationError>()(
  'AuthenticationError',
  {
    message: Schema.String,
    code: Schema.optional(Schema.String),
  },
  HttpApiSchema.annotations({ status: 401 })
) {}

class AuthorizationError extends Schema.TaggedError<AuthorizationError>()(
  'AuthorizationError',
  {
    message: Schema.String,
    code: Schema.optional(Schema.String),
  },
  HttpApiSchema.annotations({ status: 403 })
) {}

class AuthValidationError extends Schema.TaggedError<AuthValidationError>()(
  'AuthValidationError',
  {
    message: Schema.String,
    field: Schema.optional(Schema.String),
  },
  HttpApiSchema.annotations({ status: 400 })
) {}

// Generic success response for auth operations
const AuthSuccessResponse = Schema.Struct({
  message: Schema.String,
  data: Schema.optional(Schema.Any),
});

// Session response schema
const SessionResponse = Schema.Struct({
  user: Schema.NullishOr(
    Schema.Struct({
      id: Schema.String,
      email: Schema.String,
      name: Schema.String,
      image: Schema.NullishOr(Schema.String),
      emailVerified: Schema.Boolean,
      createdAt: Schema.Date,
      updatedAt: Schema.Date,
    })
  ),
  session: Schema.NullishOr(
    Schema.Struct({
      id: Schema.String,
      userId: Schema.String,
      expiresAt: Schema.Date,
      token: Schema.String,
      ipAddress: Schema.optional(Schema.String),
      userAgent: Schema.optional(Schema.String),
    })
  ),
});

// Auth API group with catch-all handler for Better Auth
export const authGroup = HttpApiGroup.make('auth')
  // Test endpoint for basic connectivity
  .add(
    HttpApiEndpoint.get('authTest', '/api/auth/test')
      .addSuccess(AuthSuccessResponse)
      .annotate(OpenApi.Description, 'Test endpoint for auth API connectivity')
  )

  // Session endpoint
  .add(
    HttpApiEndpoint.get('getSession', '/api/auth/get-session')
      .addSuccess(SessionResponse)
      .addError(AuthenticationError)
      .annotate(OpenApi.Description, 'Get current user session')
  )

  // Sign out endpoint
  .add(
    HttpApiEndpoint.post('signOut', '/api/auth/sign-out')
      .addSuccess(AuthSuccessResponse)
      .addError(AuthenticationError)
      .annotate(OpenApi.Description, 'Sign out current user')
  )

  // Magic link endpoints
  .add(
    HttpApiEndpoint.post('sendMagicLink', '/api/auth/sign-in/magic-link')
      .setPayload(Schema.Struct({ email: Schema.String }))
      .addSuccess(AuthSuccessResponse)
      .addError(AuthValidationError)
      .annotate(OpenApi.Description, 'Send magic link to email address')
  )

  .add(
    HttpApiEndpoint.get(
      'verifyMagicLink',
      '/api/auth/sign-in/magic-link/verify'
    )
      .setUrlParams(
        Schema.Struct({
          token: Schema.String,
          callbackURL: Schema.optional(Schema.String),
        })
      )
      .addSuccess(SessionResponse)
      .addError(AuthenticationError)
      .addError(AuthValidationError)
      .annotate(
        OpenApi.Description,
        'Verify magic link token and create session'
      )
  )

  // Catch-all endpoints disabled for now - interfere with other API routes
  // TODO: Need better approach for Better Auth pass-through
  // .add(
  //   HttpApiEndpoint.get("authCatchAllGet", "/*")
  //     .addSuccess(Schema.Any)
  //     .addError(AuthenticationError)
  //     .addError(AuthorizationError)
  //     .addError(AuthValidationError)
  //     .annotate(OpenApi.Description, "Pass-through GET handler for Better Auth routes")
  // )
  // .add(
  //   HttpApiEndpoint.post("authCatchAllPost", "/*")
  //     .setPayload(Schema.optional(Schema.Any))
  //     .addSuccess(Schema.Any)
  //     .addError(AuthenticationError)
  //     .addError(AuthorizationError)
  //     .addError(AuthValidationError)
  //     .annotate(OpenApi.Description, "Pass-through POST handler for Better Auth routes")
  // )
  .annotate(
    OpenApi.Description,
    'Authentication endpoints powered by Better Auth'
  );

// Export error classes for use in handlers
export { AuthenticationError, AuthorizationError, AuthValidationError };
