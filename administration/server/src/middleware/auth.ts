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
  AuthLive,
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
export class AuthMiddleware extends HttpApiMiddleware.Tag<AuthMiddleware>()(
  'Authentication',
  {
    failure: UnauthorizedError,
    provides: CurrentUser,
    security: {
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
// WIP: TODO: currently non-functional; requires more details about:
// e2e testing (seeded dataset, bypass helper, tests themselves)
// production deployment (seeded dataset? create in UI manually?, security audit)
export class AuthorizationHTTP extends HttpApiMiddleware.Tag<AuthorizationHTTP>()(
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
export const AuthMiddlewareLive = Layer.effect(
  AuthMiddleware,
  Effect.gen(function* () {
    const authService = yield* Auth;

    return {
      sessionCookie: (sessionToken) =>
        Effect.gen(function* () {
          const headers = {
            cookie: `better-auth.session_token=${Redacted.value(sessionToken)}`,
          };

          const session = yield* authService.validateSession(headers).pipe(
            Effect.mapError((error) => {
              // this gets passed in `AuthenticationError | TimeoutException but
              // we don't handle those specially
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
).pipe(Layer.provide(AuthLive));

// Authorization middleware implementation
export const AuthorizationMiddlewareLive = Layer.effect(
  AuthorizationHTTP,
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
                  message:
                    'Authentication service timeout during authorization',
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
