import { Data, Effect, Layer } from 'effect';
import { NotFoundError } from './errors/CommonErrors';

import { Flag, FlagLive, IFlag } from './layers/FlagLayer';

// Error types using Effect Data.TaggedError
export class AuthorizationError extends Data.TaggedError('AuthorizationError')<{
  readonly cause: unknown;
  readonly message?: string;
  readonly reason: 'permission_denied';
  readonly resource?: string;
  readonly requiredPermission?: string;
}> {}

// Type definitions for CASL abilities
export type Action = 'create' | 'read' | 'update' | 'delete';
export type ResourceType =
  | 'account'
  | 'audit_log'
  | 'events'
  | 'events_marketing'
  | 'events_volunteers'
  | 'external_integrations'
  | 'flags'
  | 'members'
  | 'members_flags'
  | 'session'
  | 'user'
  | 'verification';
export type Resource = { type: ResourceType; id: string };
export type Subject = Resource | ResourceType;

type AnyAbility = any; // TODO: implement authz logic

interface IAuthorizationService {
  readonly checkPermission: (
    userId: string,
    action: Action,
    subject: Subject,
    field?: string
  ) => Effect.Effect<boolean, AuthorizationError | NotFoundError, IFlag>;
}

const checkPermission: IAuthorizationService['checkPermission'] = (
  userId,
  action,
  subject,
  field
) =>
  Effect.gen(function* () {
    const flagService = yield* Flag;

    // TODO: implement authz logic

    // TODO retrieve list of rules

    // i'll need to build a list of rules huh won't I, elsewhere.
    // resources and which flags can access them

    // retrieve user's list of flags
    const flags = yield* flagService
      .getMemberFlags(userId)
      .pipe(Effect.catchAll(() => Effect.succeed([])));

    // retrieve rules for requested resource (subject)

    // compute permissions for a given set of flags

    return true;
  }).pipe(Effect.withSpan('check-permission'));

// AuthorizationService using Effect.Tag pattern
export class AuthorizationService extends Effect.Tag('AuthorizationService')<
  AuthorizationService,
  IAuthorizationService
>() {
  // Live implementation that depends on DatabaseService
  static Live: Layer.Layer<AuthorizationService, never, never> = Layer.succeed(
    AuthorizationService,
    {
      checkPermission: (userId, action, subject, field) =>
        checkPermission(userId, action, subject, field).pipe(
          Effect.provide(FlagLive)
        ),
    }
  );
}
