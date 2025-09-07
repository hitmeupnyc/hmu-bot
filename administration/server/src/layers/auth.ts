import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import { Console, Context, Data, Effect, Layer, Schedule } from 'effect';
import { TimeoutException } from 'effect/Cause';
import { DurationInput } from 'effect/Duration';
import * as Schema from 'effect/Schema';
import { Kysely, sql } from 'kysely';
import { ParseError, UnrecoverableError } from '~/api/errors';
import { DatabaseLive, DatabaseService } from '~/layers/db';
import type { DB as DatabaseSchema, Session as DbSession } from '~/types';
import { SnakeToCamelCaseObject } from '~/types/typehelpers';

const config = {
  sessionTimeout: '30 minutes' as DurationInput,
  retryAttempts: 3,
  retryDelay: '100 millis' as DurationInput,
  enableMetrics: true,
  baseURL: 'http://localhost:5173',
  clientURL: 'http://localhost:5173',
  magicLinkExpiresIn: 60 * 15, // 15 minutes
  sessionExpiresIn: 60 * 60 * 24 * 7, // 7 days
  sessionUpdateAge: 60 * 60 * 24, // 1 day
};

const sendEmail = (email: string, url: string) => {
  // TODO: replace this with an actual email
  console.log(`==================================================`);
  console.log(`magic link 👉 ${url} 👈 to ${email}`);
  console.log(`==================================================`);
};

const sendMagicLink =
  (db: Kysely<DatabaseSchema>, send: (email, url) => void) =>
  async ({ email, url }) => {
    // Allow any email ending with @hitmeupnyc.com
    if (email.endsWith('@hitmeupnyc.com')) {
      send(email, url);
      return;
    }

    try {
      const member = await db
        .selectFrom('members')
        .select('id')
        .where('email', '=', email)
        .executeTakeFirst();

      if (!member) {
        return;
      }
      send(email, url);
    } catch (error) {
      console.error('Error validating email access:', error);
    }
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
  readonly auth: ReturnType<typeof betterAuth>;
}

export const Auth = Context.GenericTag<IAuth>('Auth');

export const AuthLive = Layer.effect(
  Auth,
  Effect.gen(function* () {
    const dbService = yield* DatabaseService;
    const rawDb = yield* dbService.querySync((db) => db);
    const kyselyDb = yield* dbService.query<Kysely<DatabaseSchema>>(
      async (db) => db
    );

    // ===========================================================================

    const isTestMode = process.env.NODE_ENV === 'test';
    const testToken = 'test-token-e2e';

    // Use the typed factory function to create auth with proper plugin types
    const auth = betterAuth({
      database: rawDb,
      baseURL: config.baseURL,
      emailAndPassword: { enabled: false },
      plugins: [
        magicLink({
          sendMagicLink: sendMagicLink(kyselyDb, sendEmail),
          expiresIn: config.magicLinkExpiresIn,
          generateToken: !isTestMode
            ? undefined
            : (email: string) => {
                // In test mode, allow the deterministic test token
                if (email === 'test@hitmeupnyc.com') {
                  return testToken;
                }
                // Otherwise generate a random token (let Better Auth handle it)
                return (
                  Math.random().toString(36).substring(2, 15) +
                  Math.random().toString(36).substring(2, 15)
                );
              },
          // Custom token validation for test mode
          storeToken: isTestMode
            ? {
                type: 'custom-hasher',
                hash: async (token: string) => {
                  // In test mode, accept the test token as-is for the test user
                  if (token === testToken) {
                    return testToken; // Return the token unchanged
                  }
                  // For other tokens, use default hashing
                  return token; // This will use the default behavior
                },
              }
            : 'plain',
        }),
      ],
      session: {
        expiresIn: config.sessionExpiresIn,
        updateAge: config.sessionUpdateAge,
      },
      trustedOrigins: [config.clientURL],
    });

    // ===========================================================================

    const validateSession: IAuth['validateSession'] = (headers) => {
      return Effect.gen(function* () {
        const validHeaders =
          yield* Schema.decodeUnknown(ExpressHeadersSchema)(headers);

        // Get session from Better Auth with retry policy
        const sessionResult = yield* Effect.tryPromise({
          try: () => auth.api.getSession({ headers: validHeaders }),
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

        const member = yield* dbService.query(async (db) =>
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

    return { validateSession, auth } satisfies IAuth;
  })
).pipe(Layer.provide(DatabaseLive));
