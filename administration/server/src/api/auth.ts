import {
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiSecurity,
  OpenApi,
} from '@effect/platform';
import { Context, Effect, Layer, Redacted, Schema } from 'effect';
import { Auth, AuthLive, type Session } from '~/layers/auth';

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
            Effect.mapError(
              () =>
                new UnauthorizedError({
                  reason: 'auth_service_error',
                  message: 'Unknown authentication error',
                })
            )
          );

          return session.user;
        }),
    };
  })
).pipe(Layer.provide(AuthLive));
