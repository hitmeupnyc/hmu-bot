import { Context, Data, Effect, Layer, Schedule } from 'effect';
import { TimeoutException } from 'effect/Cause';
import { DurationInput } from 'effect/Duration';
import * as Schema from 'effect/Schema';
import { AuthorizationService } from '~/services/effect/AuthorizationEffects';
import {
  BetterAuth,
  BetterAuthLive,
} from '~/services/effect/layers/BetterAuthLayer';

const config = {
  sessionTimeout: '30 minutes' as DurationInput,
  retryAttempts: 3,
  retryDelay: '100 millis' as DurationInput,
  enableMetrics: true,
};

export interface Session {
  readonly id: string;
  readonly userId: string;
  readonly user: {
    readonly id: string;
    readonly email: string;
    readonly name: string;
  };
  readonly expiresAt: Date;
}
// Utility types for middleware integration
export interface MiddlewareContext {
  readonly session?: Session;
  readonly permissionResult?: {
    readonly allowed: boolean;
    readonly reason?: string;
    readonly resource?: { type: string; id: string };
  };
}

export class AuthenticationError extends Data.TaggedError(
  'AuthenticationError'
)<{
  readonly reason:
    | 'missing_session'
    | 'invalid_session'
    | 'expired_session'
    | 'auth_service_error';
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class SessionValidationError extends Data.TaggedError(
  'SessionValidationError'
)<{
  readonly cause: unknown;
  readonly headers?: Record<string, string>;
}> {}

// TODO: actually rig these up to use the right headers
export const ExpressHeadersSchema = Schema.Any;
export type ExpressHeaders = typeof ExpressHeadersSchema.Type;

// =============================================================================
// AUTH SERVICE INTERFACE
// =============================================================================

export interface IAuth {
  readonly validateSession: (
    headers: Record<string, string | string[] | undefined>
  ) => Effect.Effect<Session, AuthenticationError | TimeoutException, never>;
}

export const Auth = Context.GenericTag<IAuth>('Auth');

export const AuthLive = Layer.effect(
  Auth,
  Effect.gen(function* () {
    // Create a service layer to provide dependencies to helper functions
    const serviceLayer = Layer.mergeAll(
      Layer.succeed(BetterAuth, yield* BetterAuth),
      Layer.succeed(AuthorizationService, yield* AuthorizationService)
    );

    return {
      validateSession: (
        headers: Record<string, string | string[] | undefined>
      ): Effect.Effect<
        Session,
        AuthenticationError | TimeoutException,
        never
      > => {
        return Effect.gen(function* () {
          const betterAuthService = yield* BetterAuth;

          // Validate headers schema
          const validHeaders = yield* Schema.decodeUnknown(
            ExpressHeadersSchema
          )(headers).pipe(
            Effect.mapError(
              (error) =>
                new AuthenticationError({
                  reason: 'auth_service_error',
                  message: 'Invalid headers format',
                  cause: error,
                })
            )
          );

          // Get session from Better Auth with retry policy
          const sessionResult = yield* Effect.tryPromise({
            try: () =>
              betterAuthService.auth.api.getSession({ headers: validHeaders }),
            catch: (error) =>
              new AuthenticationError({
                reason: 'auth_service_error',
                message: 'Failed to validate session',
                cause: error,
              }),
          }).pipe(
            Effect.withSpan('validate-session-external'),
            Effect.retry(
              Schedule.exponential(config.retryDelay).pipe(
                Schedule.intersect(Schedule.recurs(config.retryAttempts))
              )
            ),
            Effect.timeout(config.sessionTimeout)
          );

          if (!sessionResult) {
            return yield* Effect.fail(
              new AuthenticationError({
                reason: 'missing_session',
                message: 'No valid session found',
              })
            );
          }

          // Validate session expiry
          const now = new Date();
          if (
            sessionResult.session.expiresAt &&
            new Date(sessionResult.session.expiresAt) < now
          ) {
            return yield* Effect.fail(
              new AuthenticationError({
                reason: 'expired_session',
                message: 'Session has expired',
              })
            );
          }

          const session = {
            id: sessionResult.session.id,
            userId: sessionResult.session.userId,
            user: {
              id: sessionResult.user.id,
              email: sessionResult.user.email,
              name: sessionResult.user.name,
            },
            expiresAt: new Date(sessionResult.session.expiresAt),
          };

          return session;
        })
          .pipe(Effect.withSpan('validate-session'))
          .pipe(Effect.provide(serviceLayer));
      },
    } satisfies IAuth;
  })
).pipe(
  Layer.provide(Layer.mergeAll(BetterAuthLive, AuthorizationService.Live))
);
