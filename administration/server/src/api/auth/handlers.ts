/**
 * Auth API handlers using @effect/platform HttpApi
 * Simple handlers that don't rely on BetterAuth integration
 */

import { HttpApiBuilder } from '@effect/platform';
import { Effect } from 'effect';
import { withHttpRequestObservability } from '~/services/effect/adapters/observabilityUtils';
import { AuthenticationError, AuthValidationError } from './endpoints';
import type { api } from '../index';

// Factory function that takes the API as a parameter to avoid circular dependency
export const createAuthApiLive = (apiParam: typeof api) =>
  HttpApiBuilder.group(apiParam, 'auth', (handlers) =>
    Effect.gen(function* () {
      return (
        handlers
          // Test endpoint
          .handle('authTest', ({ request }) =>
            Effect.gen(function* () {
              return {
                message: 'Auth API is working',
                data: { timestamp: new Date().toISOString() }
              };
            }).pipe(withHttpRequestObservability('api.auth.test', request))
          )

          // Get session endpoint - placeholder for now
          .handle('getSession', ({ request }) =>
            Effect.gen(function* () {
              return { user: null, session: null };
            }).pipe(
              withHttpRequestObservability('api.auth.getSession', request)
            )
          )

          // Sign out endpoint - placeholder for now
          .handle('signOut', ({ request }) =>
            Effect.gen(function* () {
              return {
                message: 'Successfully signed out'
              };
            }).pipe(withHttpRequestObservability('api.auth.signOut', request))
          )

          // Send magic link endpoint - placeholder for now
          .handle('sendMagicLink', ({ payload, request }) =>
            Effect.gen(function* () {
              return {
                message: `Magic link sent to ${payload.email}`,
                data: { email: payload.email }
              };
            }).pipe(
              withHttpRequestObservability('api.auth.sendMagicLink', request)
            )
          )

          // Verify magic link endpoint - placeholder for now
          .handle('verifyMagicLink', ({ urlParams, request }) =>
            Effect.gen(function* () {
              return {
                user: null,
                session: null
              };
            }).pipe(
              withHttpRequestObservability('api.auth.verifyMagicLink', request)
            )
          )
      );
    })
  );
