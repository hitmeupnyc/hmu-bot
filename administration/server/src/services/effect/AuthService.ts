import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import { Config, Context, Data, Effect, Layer, Schedule } from 'effect';
import * as Schema from 'effect/Schema';

import { TimeoutException } from 'effect/Cause';
import {
  DatabaseLive,
  DatabaseService,
} from './layers/DatabaseLayer';
import {
  AuthorizationError,
  AuthorizationService,
} from './AuthorizationEffects';

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

export interface AuthContext {
  readonly session: Session;
  readonly user: {
    readonly id: string;
    readonly email: string;
    readonly flags?: string[];
  };
}

// Permission check result for detailed responses
export interface PermissionResult {
  readonly allowed: boolean;
  readonly reason?: 'permission_denied' | 'missing_flag';
  readonly missingFlag?: string;
  readonly resource?: { type: string; id: string };
}

// Utility types for middleware integration
export interface MiddlewareContext {
  readonly session?: Session;
  readonly user?: {
    readonly id: string;
    readonly email: string;
    readonly flags?: string[];
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
export const AuthConfigSchema = Config.all({
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

export type AuthConfig = Config.Config.Success<typeof AuthConfigSchema>;
export type AuthServiceConfig = Config.Config.Success<typeof authServiceConfigSchema>;

const AuthServiceConfigTag = Context.GenericTag<AuthServiceConfig>('AuthServiceConfig');

export const AuthServiceConfigLayer = Layer.effect(
  AuthServiceConfigTag,
  authServiceConfigSchema
);

// =============================================================================
// BETTER AUTH SERVICE
// =============================================================================

export interface IBetterAuthService {
  readonly auth: ReturnType<typeof betterAuth>;
}

export const BetterAuthService = Context.GenericTag<IBetterAuthService>('BetterAuthService');

export const BetterAuthLive = Layer.effect(
  BetterAuthService,
  Effect.gen(function* () {
    const config = yield* AuthConfigSchema;
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
            console.log(`[EMAIL STUB] Send magic link to ${email}: ${url}`);
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

    return { auth };
  })
).pipe(Layer.provide(DatabaseLive));

// =============================================================================
// AUTH SERVICE INTERFACE
// =============================================================================

export interface IAuthService {
  readonly validateSession: (
    headers: Record<string, string | string[] | undefined>
  ) => Effect.Effect<Session, AuthenticationError | TimeoutException, never>;

  readonly checkPermission: (
    session: Session,
    action: string,
    subject: string | object,
    field?: string
  ) => Effect.Effect<boolean, AuthorizationError | TimeoutException, never>;

  readonly checkResourcePermission: (
    session: Session,
    resourceType: string,
    resourceId: string,
    permission: string,
    requiredFlags?: string[]
  ) => Effect.Effect<boolean, AuthorizationError | TimeoutException, never>;

  readonly hasFlags: (
    email: string,
    flags: string[]
  ) => Effect.Effect<boolean, AuthorizationError | TimeoutException, never>;

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
): Effect.Effect<Session, AuthenticationError | TimeoutException, IBetterAuthService | AuthServiceConfig> =>
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

    return {
      id: sessionResult.session.id,
      userId: sessionResult.session.userId,
      user: {
        id: sessionResult.user.id,
        email: sessionResult.user.email,
        name: sessionResult.user.name,
      },
      expiresAt: new Date(sessionResult.session.expiresAt),
    };
  });

const checkPermission = (
  session: Session,
  action: string,
  subject: string | object,
  field?: string
): Effect.Effect<boolean, AuthorizationError | TimeoutException, AuthorizationService | AuthServiceConfig> =>
  Effect.gen(function* () {
    const config = yield* AuthServiceConfigTag;
    const authorizationService = yield* AuthorizationService;

    // HMU domain bypass if enabled
    if (
      config.hmuDomainBypass &&
      session.user.email.endsWith('@hitmeupnyc.com')
    ) {
      yield* Effect.log(
        `🔓 HMU domain bypass: ${session.user.email} granted ${action} on ${JSON.stringify(subject)}`
      );
      return true;
    }

    // Use authorization service to check permission
    const hasPermission = yield* authorizationService
      .checkPermission(session.userId, action, subject, field)
      .pipe(
        Effect.withSpan('check-permission'),
        Effect.mapError((error) => {
          // Map NotFoundError to AuthorizationError
          if ('_tag' in error && error._tag === 'NotFoundError') {
            return new AuthorizationError({
              cause: error,
              reason: 'permission_denied',
              message: `Permission check failed: ${(error as any).message}`,
              requiredPermission: `${action} on ${JSON.stringify(subject)}`,
            });
          }
          return error as AuthorizationError;
        })
      );

    return hasPermission;
  });

const checkResourcePermission = (
  session: Session,
  resourceType: string,
  resourceId: string,
  permission: string,
  requiredFlags?: string[]
): Effect.Effect<boolean, AuthorizationError | TimeoutException, AuthorizationService> =>
  Effect.gen(function* () {
    const authorizationService = yield* AuthorizationService;

    // Check basic resource permission first
    const hasPermission = yield* authorizationService
      .checkPermission(session.userId, permission, {
        objectType: resourceType,
        objectId: resourceId,
      })
      .pipe(
        Effect.mapError(
          (error) =>
            new AuthorizationError({
              cause: error,
              reason: 'permission_denied',
              message: 'Permission denied for resource',
              requiredPermission: permission,
              resource: `${resourceType}:${resourceId}`,
            })
        )
      );

    if (!hasPermission) {
      return false;
    }

    // Check required flags if specified
    if (requiredFlags && requiredFlags.length > 0) {
      const hasAllFlags = yield* hasFlags(session.user.email, requiredFlags);

      if (!hasAllFlags) {
        // Find the specific missing flag
        for (const flag of requiredFlags) {
          const hasThisFlag = yield* hasFlags(session.user.email, [flag]);
          if (!hasThisFlag) {
            return yield* Effect.fail(
              new AuthorizationError({
                cause: `Missing flag: ${flag}`,
                reason: 'permission_denied',
                message: `Missing required flag: ${flag}`,
                resource: `${resourceType}:${resourceId}`,
              })
            );
          }
        }
      }
    }

    return true;
  });

const hasFlags = (
  email: string,
  flags: string[]
): Effect.Effect<boolean, AuthorizationError | TimeoutException, AuthorizationService> =>
  Effect.gen(function* () {
    const authorizationService = yield* AuthorizationService;

    // TODO: this is definitely slow
    for (const flag of flags) {
      const hasFlag = yield* authorizationService.memberHasFlag(email, flag);

      if (!hasFlag) {
        return false;
      }
    }

    return true;
  }).pipe(
    Effect.catchTag('NotFoundError', () =>
      Effect.fail(
        new AuthorizationError({
          cause: 'Member not found',
          reason: 'permission_denied',
          message: 'Member not found',
        })
      )
    )
  );

const isHmuDomainUser = (email: string): Effect.Effect<boolean, never, never> =>
  Effect.succeed(email.endsWith('@hitmeupnyc.com'));

// =============================================================================
// SERVICE LAYER IMPLEMENTATION
// =============================================================================

export const AuthServiceLive = Layer.effect(
  AuthService,
  Effect.gen(function* () {
    // Get all dependencies upfront
    const betterAuthService = yield* BetterAuthService;
    const authorizationService = yield* AuthorizationService;
    const config = yield* AuthServiceConfigTag;

    const serviceLayer = Layer.mergeAll(
      Layer.succeed(BetterAuthService, betterAuthService),
      Layer.succeed(AuthorizationService, authorizationService),
      Layer.succeed(AuthServiceConfigTag, config)
    );

    return {
      validateSession: (headers) =>
        validateSession(headers).pipe(Effect.provide(serviceLayer)),
      checkPermission: (session, action, subject, field) =>
        checkPermission(session, action, subject, field).pipe(Effect.provide(serviceLayer)),
      checkResourcePermission: (
        session,
        resourceType,
        resourceId,
        permission,
        requiredFlags
      ) =>
        checkResourcePermission(
          session,
          resourceType,
          resourceId,
          permission,
          requiredFlags
        ).pipe(Effect.provide(serviceLayer)),
      hasFlags: (email, flags) =>
        hasFlags(email, flags).pipe(Effect.provide(serviceLayer)),
      isHmuDomainUser,
    } satisfies IAuthService;
  })
).pipe(
  Layer.provide(BetterAuthLive),
  Layer.provide(AuthorizationService.Live),
  Layer.provide(AuthServiceConfigLayer)
);