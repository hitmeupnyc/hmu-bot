import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import { Context, Data, Effect, Layer, Schedule } from 'effect';
import * as Schema from 'effect/Schema';

import { TimeoutException } from 'effect/Cause';
import {
  AuthorizationError,
  AuthorizationService,
} from './AuthorizationEffects';
import { EmailService, getEmailServiceLayer } from './EmailEffects';
import { DatabaseService } from './layers/DatabaseLayer';

// Get database path from environment or use default

type IAuthConfig = ReturnType<typeof betterAuth>;

export const BetterAuth = Context.GenericTag<IAuthConfig>('BetterAuth');
export const BetterAuthLayer = Layer.effect(
  BetterAuth,
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const dbClient = yield* db.query(async (db) => db);
    return betterAuth({
      database: dbClient,

      baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:5173',

      // Disable email/password since we only use magic links
      emailAndPassword: {
        enabled: false,
      },

      // Configure magic link plugin
      plugins: [
        magicLink({
          sendMagicLink: async ({ email, url, token }, request) => {
            // Use Effect-based email service
            const emailLayer = getEmailServiceLayer();

            const sendEmailEffect = Effect.gen(function* () {
              const emailService = yield* EmailService;
              yield* emailService.sendMagicLink(email, url);
            });

            try {
              await Effect.runPromise(
                sendEmailEffect.pipe(Effect.provide(emailLayer))
              );
            } catch (error) {
              console.error('Failed to send magic link email:', error);
              // Don't fail the auth flow if email fails in development
              if (process.env.NODE_ENV === 'development') {
                console.log(`[FALLBACK] Magic link URL: ${url}`);
              } else {
                throw error;
              }
            }
          },
          expiresIn: 60 * 15, // 15 minutes
        }),
      ],

      // Session configuration
      session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // Update session if older than 1 day
        cookieCache: {
          enabled: true,
          maxAge: 60 * 5, // Cache for 5 minutes
        },
      },

      // CORS configuration
      trustedOrigins: [process.env.CLIENT_URL || 'http://localhost:5173'],

      // Advanced configuration
      advanced: {
        cookiePrefix: 'hmu-auth',
        useSecureCookies: process.env.NODE_ENV === 'production',
      },
    });
  })
);

// Domain Types
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

// Error Types with structured information
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

// Configuration Schema
export const AuthConfigSchema = Schema.Struct({
  sessionTimeout: Schema.optionalWith(Schema.String, {
    default: () => '30 minutes',
  }),
  retryAttempts: Schema.optionalWith(Schema.Number, { default: () => 3 }),
  retryDelay: Schema.optionalWith(Schema.String, {
    default: () => '100 millis',
  }),
  enableMetrics: Schema.optionalWith(Schema.Boolean, { default: () => true }),
  hmuDomainBypass: Schema.optionalWith(Schema.Boolean, { default: () => true }),
});

export type AuthConfig = typeof AuthConfigSchema.Type;

// Core Auth Service Interface
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

const validateSession = (
  headers: Record<string, string | string[] | undefined>
): IAuthService['validateSession'] =>
  Effect.gen(function* () {
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

    const auth = yield* BetterAuth;

    // Get session from Better Auth with retry policy
    const sessionResult = yield* Effect.tryPromise({
      try: () => auth.api.getSession({ headers: validHeaders as any }),
      catch: (error) =>
        new AuthenticationError({
          reason: 'auth_service_error',
          message: 'Failed to validate session',
          cause: error,
        }),
    }).pipe(
      Effect.retry(
        Schedule.exponential(authConfig.retryDelay).pipe(
          Schedule.intersect(Schedule.recurs(authConfig.retryAttempts))
        )
      ),
      Effect.timeout(`${authConfig.sessionTimeout}`),
      Effect.withSpan('validate-session-external')
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
  }).pipe(Effect.provide(BetterAuthLayer));

const checkPermission = (
  session: Session,
  action: string,
  subject: string | object,
  field?: string
): IAuthService['checkPermission'] =>
  Effect.gen(function* () {
    // HMU domain bypass if enabled
    if (
      authConfig.hmuDomainBypass &&
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
        Effect.mapError(
          (error) =>
            new AuthorizationError({
              reason: 'permission_denied',
              message: `Permission check failed: ${String(error)}`,
              requiredPermission: `${action} on ${JSON.stringify(subject)}`,
            })
        ),
        Effect.withSpan('check-permission', {
          userId: session.userId,
          action,
          subject: JSON.stringify(subject),
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
): IAuthService['checkResourcePermission'] =>
  Effect.gen(function* () {
    // Check basic resource permission first
    const hasPermission = yield* authorizationService
      .checkPermission(session.userId, permission, {
        objectType: resourceType,
        objectId: resourceId,
      })
      .pipe(
        Effect.mapError(
          () =>
            new AuthorizationError({
              reason: 'permission_denied',
              message: 'Permission denied for resource',
              requiredPermission: permission,
              resource: { type: resourceType, id: resourceId },
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
                reason: 'missing_flag',
                message: `Missing required flag: ${flag}`,
                missingFlag: flag,
              })
            );
          }
        }
      }
    }

    return true;
  });

const hasFlags = (email: string, flags: string[]): IAuthService['hasFlags'] =>
  Effect.gen(function* () {
    const authorizationService = yield* AuthorizationService.Live;
    for (const flag of flags) {
      const hasFlag = yield* authorizationService.memberHasFlag(email, flag);

      if (!hasFlag) {
        return false;
      }
    }

    return true;
  });

const isHmuDomainUser = (email: string): Effect.Effect<boolean, never, never> =>
  Effect.succeed(email.endsWith('@hitmeupnyc.com'));

// Live implementation of AuthService
export const AuthServiceLive = Layer.succeed(AuthService, {
  validateSession,
  checkPermission,
  checkResourcePermission,
  hasFlags,
  isHmuDomainUser,
} satisfies IAuthService);
