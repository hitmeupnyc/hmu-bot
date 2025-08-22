/**
 * Authentication and authorization pipeline functions for Effect HTTP
 * 
 * These functions handle auth concerns in the Effect pipeline, replacing
 * the traditional Express middleware approach with composable Effect functions.
 */

import { Effect, Layer } from 'effect';
import { AuthUser, Express, IExpress } from './context';
import { Auth } from '../layers/AuthLayer';
import { AuthorizationService, type Action, type Subject } from '../AuthorizationEffects';
import { FlagLive } from '../layers/FlagLayer';

/**
 * Require authentication and inject user into context
 */
export const requireAuth = () =>
  <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E, R | IExpress | typeof Auth> =>
    Effect.gen(function* () {
      const { req } = yield* Express;
      const authService = yield* Auth;
      
      // Extract headers for auth validation
      const headers = req.headers as Record<string, string | string[] | undefined>;
      
      const session = yield* authService.validateSession(headers);
      
      return yield* effect.pipe(
        Effect.provideService(AuthUser, session.user)
      );
    });

/**
 * Require specific permission for a resource
 */
export const requirePermission = (
  action: Action,
  subject: Subject | ((user: any) => Subject),
  field?: string
) =>
  <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E, R | typeof AuthUser | typeof AuthorizationService> =>
    Effect.gen(function* () {
      const user = yield* AuthUser;
      const authorizationService = yield* AuthorizationService;
      
      const targetSubject = typeof subject === 'function' ? subject(user) : subject;
      
      const hasPermission = yield* authorizationService
        .checkPermission(user.id, action, targetSubject, field)
        .pipe(Effect.catchAll(() => Effect.succeed(false)));
      
      if (!hasPermission) {
        return yield* Effect.fail(new Error('Permission denied'));
      }
      
      return yield* effect;
    }).pipe(
      Effect.provide(Layer.mergeAll(AuthorizationService.Live, FlagLive))
    );