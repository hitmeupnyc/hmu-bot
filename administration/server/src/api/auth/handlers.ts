/**
 * Auth API handlers using @effect/platform HttpApi
 * Implements Better Auth integration with proper Effect patterns
 */

import { HttpApiBuilder } from '@effect/platform';
import { Effect } from 'effect';
import { withHttpRequestObservability } from '~/services/effect/adapters/observabilityUtils';
import { BetterAuth } from '~/services/effect/layers/BetterAuthLayer';
import type { api } from '../index';
import { AuthenticationError, AuthValidationError } from './endpoints';

// Factory function that takes the API as a parameter to avoid circular dependency
export const createAuthApiLive = (apiParam: typeof api) =>
  HttpApiBuilder.group(apiParam, 'auth', (handlers) =>
    Effect.gen(function* () {
      const betterAuthService = yield* BetterAuth;

      return (
        handlers
          // Test endpoint
          .handle('authTest', ({ request }) =>
            Effect.succeed({
              message: 'Auth API is working',
              data: { timestamp: new Date().toISOString() },
            }).pipe(withHttpRequestObservability('api.auth.test', request))
          )

          // Get session endpoint
          .handle('getSession', ({ request }) =>
            Effect.gen(function* () {
              // Convert request headers to plain object for BetterAuth
              const headerRecord: Record<string, string> = {};

              // Access headers directly as properties
              const cookieHeader = request.headers.cookie;
              const authHeader = request.headers.authorization;

              if (cookieHeader) headerRecord.cookie = cookieHeader;
              if (authHeader) headerRecord.authorization = authHeader;

              const session = yield* Effect.tryPromise({
                try: () =>
                  betterAuthService.auth.api.getSession({
                    headers: headerRecord as any,
                  }),
                catch: (error) =>
                  new AuthenticationError({
                    message:
                      error instanceof Error
                        ? error.message
                        : 'Authentication failed',
                    code: 'SESSION_ERROR',
                  }),
              });

              // Transform the response to match our schema
              const result = session
                ? {
                    user: session.user
                      ? {
                          id: session.user.id,
                          email: session.user.email,
                          name: session.user.name,
                          image: session.user.image || null,
                          emailVerified: session.user.emailVerified,
                          createdAt: session.user.createdAt,
                          updatedAt: session.user.updatedAt,
                        }
                      : null,
                    session: session.session
                      ? {
                          id: session.session.id,
                          userId: session.session.userId,
                          expiresAt: session.session.expiresAt,
                          token: session.session.token,
                          ipAddress: session.session.ipAddress || undefined,
                          userAgent: session.session.userAgent || undefined,
                        }
                      : null,
                  }
                : { user: null, session: null };

              return result;
            }).pipe(
              withHttpRequestObservability('api.auth.getSession', request)
            )
          )

          // Sign out endpoint
          .handle('signOut', ({ request }) =>
            Effect.gen(function* () {
              // Convert request headers to plain object for BetterAuth
              const headerRecord: Record<string, string> = {};

              const cookieHeader = request.headers.cookie;
              const authHeader = request.headers.authorization;

              if (cookieHeader) headerRecord.cookie = cookieHeader;
              if (authHeader) headerRecord.authorization = authHeader;

              yield* Effect.tryPromise({
                try: () =>
                  betterAuthService.auth.api.signOut({
                    headers: headerRecord as any,
                    asResponse: true,
                  }),
                catch: (error) =>
                  new AuthenticationError({
                    message:
                      error instanceof Error
                        ? error.message
                        : 'Sign out failed',
                    code: 'SIGNOUT_ERROR',
                  }),
              });

              return {
                message: 'Successfully signed out',
              };
            }).pipe(withHttpRequestObservability('api.auth.signOut', request))
          )

          // Send magic link endpoint
          .handle('sendMagicLink', ({ payload, request }) =>
            Effect.gen(function* () {
              // Convert request headers for BetterAuth
              const headerRecord: Record<string, string> = {};
              const cookieHeader = request.headers.cookie;
              if (cookieHeader) headerRecord.cookie = cookieHeader;

              // Use BetterAuth's magic link API method with proper types
              yield* Effect.tryPromise({
                try: () => betterAuthService.auth.api.signInMagicLink({
                  body: { 
                    email: payload.email,
                    callbackURL: '/dashboard' // Optional: customize callback URL
                  },
                  headers: headerRecord as any,
                }),
                catch: (error) => new AuthValidationError({
                  message: error instanceof Error ? error.message : 'Failed to send magic link',
                  field: 'email'
                })
              });

              console.log(`Magic link sent for: ${payload.email}`);

              return {
                message: `Magic link sent to ${payload.email}`,
                data: {
                  email: payload.email,
                  success: true
                },
              };
            }).pipe(
              withHttpRequestObservability('api.auth.sendMagicLink', request)
            )
          )

          // Verify magic link endpoint
          .handle('verifyMagicLink', ({ urlParams, request }) =>
            Effect.succeed({
              user: null,
              session: null,
            }).pipe(
              withHttpRequestObservability('api.auth.verifyMagicLink', request)
            )
          )
      );
    })
  );
