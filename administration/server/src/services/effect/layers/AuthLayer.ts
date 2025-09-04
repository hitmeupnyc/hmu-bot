import { Console, Context, Data, Effect, Layer, Schedule } from 'effect';
import { TimeoutException } from 'effect/Cause';
import { DurationInput } from 'effect/Duration';
import * as Schema from 'effect/Schema';
import { sql } from 'kysely';
import {
  BetterAuth,
  BetterAuthLive,
} from '~/services/effect/layers/BetterAuthLayer';
import { Session as DbSession } from '~/types';
import { SnakeToCamelCaseObject } from '~/types/typehelpers';
import { ParseError, UnrecoverableError } from '../errors/CommonErrors';
import { DatabaseLive, DatabaseService } from './DatabaseLayer';

const config = {
  sessionTimeout: '30 minutes' as DurationInput,
  retryAttempts: 3,
  retryDelay: '100 millis' as DurationInput,
  enableMetrics: true,
};

export interface Session extends SnakeToCamelCaseObject<DbSession> {
  readonly user: {
    readonly id: string;
    readonly email: string;
    readonly name: string;
    readonly memberId: string;
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
  ) => Effect.Effect<
    Session,
    AuthenticationError | TimeoutException | UnrecoverableError | ParseError,
    never
  >;
}

export const Auth = Context.GenericTag<IAuth>('Auth');

export const AuthLive = Layer.effect(
  Auth,
  Effect.gen(function* () {
    const betterAuthService = yield* BetterAuth;
    const db = yield* DatabaseService;

    const validateSession: IAuth['validateSession'] = (headers) => {
      return Effect.gen(function* () {
        const validHeaders =
          yield* Schema.decodeUnknown(ExpressHeadersSchema)(headers);

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
          Effect.withSpan('auth.session.betterauth'),
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

        const newSession = {
          ...sessionResult.session,
          ipAddress: sessionResult.session.ipAddress || null,
          userAgent: sessionResult.session.userAgent || null,
          updatedAt: sessionResult.session.updatedAt.toISOString(),
          createdAt: sessionResult.session.createdAt.toISOString(),
          expiresAt: sessionResult.session.expiresAt.toISOString(),
        } satisfies Omit<Session, 'user'>;

        if (sessionResult.user.email.includes('@hitmeupnyc.com')) {
          return {
            ...newSession,
            user: {
              memberId: sessionResult.user.id,
              id: sessionResult.user.id,
              email: sessionResult.user.email,
              name: sessionResult.user.name,
            },
          };
        }

        const member = yield* db.query(async (db) =>
          db
            .selectFrom('user')
            .innerJoin('members', 'members.email', 'user.email')
            .select([
              'user.id',
              'members.email',
              sql<string>`CONCAT(members.first_name, ' ', members.last_name)`.as(
                'name'
              ),
            ])
            .where('user.id', '=', sessionResult.session.userId)
            .executeTakeFirstOrThrow()
        );

        return {
          ...newSession,
          user: {
            memberId: member.id,
            id: member.id,
            email: member.email,
            name: member.name,
          },
        };
      }).pipe(
        Effect.withSpan('auth.session.validate'),
        Effect.tapError((e) => Console.error('validateSessions layer', { e }))
      );
    };

    return { validateSession } satisfies IAuth;
  })
).pipe(Layer.provide(Layer.mergeAll(BetterAuthLive, DatabaseLive)));
