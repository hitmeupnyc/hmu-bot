import { betterAuth } from 'better-auth';
import { toNodeHandler } from 'better-auth/node';
import { magicLink } from 'better-auth/plugins';
import { Config, Context, Data, Effect, Layer, Schedule } from 'effect';
import * as Schema from 'effect/Schema';

import { TimeoutException } from 'effect/Cause';
import { AuthorizationService } from './AuthorizationEffects';
import { DatabaseLive, DatabaseService } from './layers/DatabaseLayer';

// =============================================================================
// DOMAIN TYPES
// =============================================================================

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

// =============================================================================
// ERROR TYPES
// =============================================================================

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

// =============================================================================
// CONFIGURATION
// =============================================================================

// BetterAuth configuration schema
const betterAuthConfigSchema = Config.all({
  baseURL: Config.string('BETTER_AUTH_URL').pipe(
    Config.withDefault('http://localhost:3000')
  ),
  clientURL: Config.string('CLIENT_URL').pipe(
    Config.withDefault('http://localhost:5173')
  ),
  magicLinkExpiresIn: Config.integer('MAGIC_LINK_EXPIRES_IN').pipe(
    Config.withDefault(60 * 15) // 15 minutes
  ),
  sessionExpiresIn: Config.integer('SESSION_EXPIRES_IN').pipe(
    Config.withDefault(60 * 60 * 24 * 7) // 7 days
  ),
  sessionUpdateAge: Config.integer('SESSION_UPDATE_AGE').pipe(
    Config.withDefault(60 * 60 * 24) // 1 day
  ),
});

// Service-specific configuration
const authServiceConfigSchema = Config.all({
  sessionTimeout: Config.duration('AUTH_SESSION_TIMEOUT').pipe(
    Config.withDefault('30 minutes')
  ),
  retryAttempts: Config.integer('AUTH_RETRY_ATTEMPTS').pipe(
    Config.withDefault(3)
  ),
  retryDelay: Config.duration('AUTH_RETRY_DELAY').pipe(
    Config.withDefault('100 millis')
  ),
  enableMetrics: Config.boolean('AUTH_ENABLE_METRICS').pipe(
    Config.withDefault(true)
  ),
  hmuDomainBypass: Config.boolean('AUTH_HMU_DOMAIN_BYPASS').pipe(
    Config.withDefault(true)
  ),
});

export type BetterAuthConfig = Config.Config.Success<
  typeof betterAuthConfigSchema
>;
export type AuthServiceConfig = Config.Config.Success<
  typeof authServiceConfigSchema
>;

export const BetterAuthConfigTag =
  Context.GenericTag<BetterAuthConfig>('BetterAuthConfig');

const AuthServiceConfigTag =
  Context.GenericTag<AuthServiceConfig>('AuthServiceConfig');

export const BetterAuthConfigLayer = Layer.effect(
  BetterAuthConfigTag,
  betterAuthConfigSchema
);

export const AuthServiceConfigLayer = Layer.effect(
  AuthServiceConfigTag,
  authServiceConfigSchema
);

// =============================================================================
// BETTER AUTH SERVICE
// =============================================================================

export interface IBetterAuthService {
  readonly auth: ReturnType<typeof betterAuth>;
  readonly toNodeHandler: () => ReturnType<typeof toNodeHandler>;
}

export const BetterAuthService =
  Context.GenericTag<IBetterAuthService>('BetterAuthService');

export const BetterAuthLive = Layer.effect(
  BetterAuthService,
  Effect.gen(function* () {
    const config = yield* BetterAuthConfigTag;
    const dbService = yield* DatabaseService;

    // Get the raw sqlite database for better-auth
    const sqliteDb = yield* dbService.querySync((db) => db);
    const auth = betterAuth({
      database: sqliteDb,

      baseURL: config.baseURL,

      emailAndPassword: {
        enabled: false, // We only use magic links
      },

      plugins: [
        magicLink({
          sendMagicLink: async ({ email, url }) => {
            // Stub for Phase 2 - will be replaced with actual email service
            console.log(`                     👇`);
            console.log(`Send magic link 👉 ${url} 👈 to ${email}`);
            console.log(`                     ☝️`);
            // TODO: Integrate with email service
          },
          expiresIn: config.magicLinkExpiresIn,
        }),
      ],

      session: {
        expiresIn: config.sessionExpiresIn,
        updateAge: config.sessionUpdateAge,
      },

      trustedOrigins: [config.clientURL],
    });

    return {
      auth,
      toNodeHandler: () => toNodeHandler(auth),
    };
  })
).pipe(Layer.provide(Layer.mergeAll(BetterAuthConfigLayer, DatabaseLive)));

// =============================================================================
// AUTH SERVICE INTERFACE
// =============================================================================

export interface IAuthService {
  readonly validateSession: (
    headers: Record<string, string | string[] | undefined>
  ) => Effect.Effect<Session, AuthenticationError | TimeoutException, never>;

  readonly isHmuDomainUser: (
    email: string
  ) => Effect.Effect<boolean, never | TimeoutException, never>;
}

export const AuthService = Context.GenericTag<IAuthService>('AuthService');

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

export const ExpressHeadersSchema = Schema.Any;
export type ExpressHeaders = typeof ExpressHeadersSchema.Type;

// =============================================================================
// CORE IMPLEMENTATION FUNCTIONS
// =============================================================================

const validateSession = (
  headers: Record<string, string | string[] | undefined>
): Effect.Effect<
  Session,
  AuthenticationError | TimeoutException,
  IBetterAuthService | AuthServiceConfig
> =>
  Effect.gen(function* () {
    const config = yield* AuthServiceConfigTag;
    const betterAuthService = yield* BetterAuthService;

    // Validate headers schema
    const validHeaders = yield* Schema.decodeUnknown(ExpressHeadersSchema)(
      headers
    ).pipe(
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
  }).pipe(Effect.withSpan('validate-session'));

const isHmuDomainUser = (email: string): Effect.Effect<boolean, never, never> =>
  Effect.succeed(email.endsWith('@hitmeupnyc.com'));

// =============================================================================
// SERVICE LAYER IMPLEMENTATION
// =============================================================================

export const AuthServiceLive = Layer.effect(
  AuthService,
  Effect.gen(function* () {
    // Create a service layer to provide dependencies to helper functions
    const serviceLayer = Layer.mergeAll(
      Layer.succeed(BetterAuthService, yield* BetterAuthService),
      Layer.succeed(AuthorizationService, yield* AuthorizationService),
      Layer.succeed(AuthServiceConfigTag, yield* AuthServiceConfigTag)
    );

    return {
      validateSession: (headers) =>
        validateSession(headers).pipe(Effect.provide(serviceLayer)),
      isHmuDomainUser,
    } satisfies IAuthService;
  })
).pipe(
  Layer.provide(
    Layer.mergeAll(
      BetterAuthLive,
      AuthorizationService.Live,
      AuthServiceConfigLayer
    )
  )
);
