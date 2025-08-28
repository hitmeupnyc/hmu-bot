/**
 * Authentication and authorization pipeline functions for Effect HTTP
 *
 * These functions handle auth concerns in the Effect pipeline, replacing
 * the traditional Express middleware approach with composable Effect functions.
 */

import { Effect } from 'effect';
import { TimeoutException } from 'effect/Cause';
import {
  AuthorizationError,
  AuthorizationService,
  type Action,
  type Subject,
} from '../AuthorizationEffects';
import { ParseError, UnrecoverableError } from '../errors/CommonErrors';
import { Auth, AuthenticationError, IAuth } from '../layers/AuthLayer';
import { ActiveSession, ActiveUser, Express, IExpress } from './context';
import { useParsedParams } from './parsers';

/**
 * Require authentication and inject user into context
 */
export const requireAuth =
  () =>
  <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<
    A,
    | E
    | AuthenticationError
    | TimeoutException
    | UnrecoverableError
    | ParseError,
    R | IExpress | IAuth
  > =>
    Effect.gen(function* () {
      const { req } = yield* Express;
      const authService = yield* Auth;

      const session = yield* authService.validateSession(
        req.headers as Record<string, string | string[] | undefined>
      );
      return yield* effect.pipe(
        Effect.provideService(ActiveUser, session.user),
        Effect.provideService(ActiveSession, session)
      );
    });

/**
 * Require specific permission for a resource
 */
export const requirePermission =
  (
    action: Action,
    subject: Subject | (({ params }) => Subject),
    field?: string
  ) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    Effect.gen(function* () {
      const user = yield* ActiveUser;
      const authorizationService = yield* AuthorizationService;
      const id = yield* useParsedParams<{ id: number }>();

      const targetSubject =
        typeof subject === 'function' ? subject({ params: { id } }) : subject;

      const hasPermission = yield* authorizationService
        .checkPermission(user.id, action, targetSubject, field)
        .pipe(Effect.catchAll(() => Effect.succeed(false)));

      if (!hasPermission) {
        return yield* Effect.fail(
          new AuthorizationError({
            reason: 'permission_denied',
            cause: undefined,
            resource:
              typeof targetSubject === 'string'
                ? targetSubject
                : JSON.stringify(targetSubject),
            requiredPermission: action,
          })
        );
      }

      return yield* effect;
    });
