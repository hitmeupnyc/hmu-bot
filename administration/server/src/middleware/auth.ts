/**
 * Authentication and Authorization middleware for @effect/platform HttpApi
 * Migrated from Effect HTTP pipeline functions
 */

import {
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiSecurity,
  OpenApi,
} from '@effect/platform';
import { Context, Effect, Layer, Redacted, Schema } from 'effect';
import { TimeoutException } from 'effect/Cause';
import {
  Auth,
  AuthenticationError,
  type Session,
} from '~/services/effect/layers/AuthLayer';

// Context tags for authenticated user and session
export class CurrentUser extends Context.Tag('CurrentUser')<
  CurrentUser,
  Session['user']
>() {}
export class ActiveSession extends Context.Tag('ActiveSession')<
  ActiveSession,
  Session
>() {}

// Authentication error for HttpApi
class UnauthorizedError extends Schema.TaggedError<UnauthorizedError>()(
  'UnauthorizedError',
  {
    reason: Schema.Literal(
      'missing_session',
      'invalid_session',
      'expired_session',
      'auth_service_error'
    ),
    message: Schema.String,
  },
  HttpApiSchema.annotations({ status: 401 })
) {}

// Authorization error for HttpApi
class ForbiddenError extends Schema.TaggedError<ForbiddenError>()(
  'ForbiddenError',
  {
    reason: Schema.Literal('permission_denied'),
    message: Schema.String,
    resource: Schema.optional(Schema.String),
    requiredPermission: Schema.optional(Schema.String),
  },
  HttpApiSchema.annotations({ status: 403 })
) {}

// Authentication middleware
export class Authentication extends HttpApiMiddleware.Tag<Authentication>()(
  'Authentication',
  {
    failure: UnauthorizedError,
    provides: CurrentUser,
    security: {
      bearer: HttpApiSecurity.bearer.pipe(
        HttpApiSecurity.annotate(
          OpenApi.Description,
          'Bearer token authentication using session tokens'
        )
      ),
      // Also support cookie-based auth for web clients
      sessionCookie: HttpApiSecurity.apiKey({
        in: 'cookie',
        key: 'better-auth.session_token',
      }).pipe(
        HttpApiSecurity.annotate(
          OpenApi.Description,
          'Session cookie authentication'
        )
      ),
    },
  }
) {}

// Authorization middleware (requires authentication)
export class Authorization extends HttpApiMiddleware.Tag<Authorization>()(
  'Authorization',
  {
    failure: ForbiddenError,
    provides: ActiveSession,
    security: {
      bearer: HttpApiSecurity.bearer,
    },
  }
) {}

// Authentication middleware implementation
export const AuthenticationLive = Layer.effect(
  Authentication,
  Effect.gen(function* () {
    const authService = yield* Auth;

    return {
      bearer: (token) =>
        Effect.gen(function* () {
          const headers = {
            authorization: `Bearer ${Redacted.value(token)}`,
          };

          const session = yield* authService.validateSession(headers).pipe(
            Effect.mapError((error) => {
              if (error instanceof AuthenticationError) {
                return new UnauthorizedError({
                  reason: error.reason,
                  message: error.message,
                });
              }
              if (error instanceof TimeoutException) {
                return new UnauthorizedError({
                  reason: 'auth_service_error',
                  message: 'Authentication service timeout',
                });
              }
              return new UnauthorizedError({
                reason: 'auth_service_error',
                message: 'Unknown authentication error',
              });
            })
          );

          return session.user;
        }),

      sessionCookie: (sessionToken) =>
        Effect.gen(function* () {
          const headers = {
            cookie: `better-auth.session_token=${Redacted.value(sessionToken)}`,
          };

          const session = yield* authService.validateSession(headers).pipe(
            Effect.mapError((error) => {
              if (error instanceof AuthenticationError) {
                return new UnauthorizedError({
                  reason: error.reason,
                  message: error.message,
                });
              }
              if (error instanceof TimeoutException) {
                return new UnauthorizedError({
                  reason: 'auth_service_error',
                  message: 'Authentication service timeout',
                });
              }
              return new UnauthorizedError({
                reason: 'auth_service_error',
                message: 'Unknown authentication error',
              });
            })
          );

          return session.user;
        }),
    };
  })
);

// Authorization middleware implementation
export const AuthorizationLive = Layer.effect(
  Authorization,
  Effect.gen(function* () {
    const authService = yield* Auth;

    return {
      bearer: (token) =>
        Effect.gen(function* () {
          const headers = {
            authorization: `Bearer ${Redacted.value(token)}`,
          };

          const session = yield* authService.validateSession(headers).pipe(
            Effect.mapError((error) => {
              if (error instanceof AuthenticationError) {
                return new ForbiddenError({
                  reason: 'permission_denied',
                  message: 'Authentication failed for authorization',
                });
              }
              if (error instanceof TimeoutException) {
                return new ForbiddenError({
                  reason: 'permission_denied',
                  message: 'Authentication service timeout during authorization',
                });
              }
              return new ForbiddenError({
                reason: 'permission_denied',
                message: 'Authorization failed due to authentication error',
              });
            })
          );

          return session;
        }),
    };
  })
);
