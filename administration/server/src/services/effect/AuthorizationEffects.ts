import { Data, Effect, Layer } from 'effect';
import type { DB } from '~/types';
import { NotFoundError } from './errors/CommonErrors';
import { DatabaseLive, DatabaseService } from './layers/DatabaseLayer';

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
export type Subject = Omit<keyof DB, 'EventAttendance'>;

type AnyAbility = any; // TODO: implement authz logic

interface IAuthorizationService {
  readonly buildAbilityForUser: (
    userId: number
  ) => Effect.Effect<AnyAbility, AuthorizationError>;
  readonly checkPermission: (
    userId: number,
    action: string,
    subject: string | object,
    field?: string
  ) => Effect.Effect<boolean, AuthorizationError>;
  readonly getUserFlags: (
    userId: number
  ) => Effect.Effect<string[], AuthorizationError>;
  readonly grantFlag: (
    memberEmail: string,
    flagId: string,
    grantedBy?: string,
    expiresAt?: Date
  ) => Effect.Effect<void, AuthorizationError>;
  readonly revokeFlag: (
    memberEmail: string,
    flagId: string
  ) => Effect.Effect<void, AuthorizationError>;
  readonly memberHasFlag: (
    memberEmail: string,
    flagId: string
  ) => Effect.Effect<boolean, AuthorizationError>;
}

const buildAbilityForUser: IAuthorizationService['buildAbilityForUser'] = (
  userId: number
) =>
  Effect.gen(function* () {
    const flags = yield* getUserFlags(userId);

    // TODO: implement authz logic
    // const { can, build } = new AbilityBuilder(createMongoAbility);

    // Admin can do everything

    // TODO: fetch flag permissions.

    // Users can always view their own member record
  });

const checkPermission: IAuthorizationService['checkPermission'] = (
  userId: number,
  action: string,
  subjectType: string | object,
  field?: string
) =>
  Effect.gen(function* () {
    const ability = yield* buildAbilityForUser(userId);

    // TODO: implement authz logic
    return true;
  });

const getUserFlags: IAuthorizationService['getUserFlags'] = (userId: number) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const flags = yield* db
      .query((database) =>
        database
          .selectFrom('members')
          .innerJoin('members_flags', 'members.id', 'members_flags.member_id')
          .innerJoin('flags', 'members_flags.flag_id', 'flags.id')
          .select('flags.id')
          .where('members.id', '=', userId)
          .execute()
      )
      .pipe(
        Effect.orElseFail<AuthorizationError>(
          () =>
            new AuthorizationError({
              cause: 'getUserFlags',
              message: 'Failed to get user flags',
            })
        )
      );
    return flags.map((f) => f.id).filter((f): f is string => Boolean(f));
  }).pipe(Effect.provide(DatabaseLive));

const grantFlag: IAuthorizationService['grantFlag'] = (
  memberEmail: string,
  flagId: string,
  grantedBy?: string,
  expiresAt?: Date
) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    // Find member by email
    const member = yield* db
      .query((database) =>
        database
          .selectFrom('members')
          .select(['id', 'email'])
          .where('email', '=', memberEmail)
          .executeTakeFirst()
      )
      .pipe(
        Effect.orElseFail<AuthorizationError>(
          () =>
            new AuthorizationError({
              cause: 'grantFlag',
              message: 'user not found',
            })
        )
      );

    if (!member) {
      yield* Effect.fail(
        new AuthorizationError({
          cause: 'grantFlag',
          message: 'user not found',
        })
      );
      return;
    }

    const memberId = (member as any).id;

    // Validate flag exists
    const flag = yield* db
      .query((database) =>
        database
          .selectFrom('flags')
          .select(['id', 'name'])
          .where('id', '=', flagId)
          .executeTakeFirst()
      )
      .pipe(
        Effect.orElseFail<AuthorizationError>(
          () =>
            new AuthorizationError({
              cause: 'grantFlag',
              message: 'Failed to grant flag',
            })
        )
      );

    if (!flag) {
      yield* Effect.fail(
        new AuthorizationError({
          cause: 'grantFlag',
          message: 'flag not found',
        })
      );
      return;
    }

    // Grant flag (upsert)
    yield* db
      .query((database) =>
        database
          .insertInto('members_flags')
          .values({
            member_id: memberId,
            flag_id: flagId,
            granted_by: grantedBy,
            expires_at: expiresAt?.toISOString(),
          })
          .onConflict((oc: any) =>
            oc.columns(['member_id', 'flag_id']).doUpdateSet({
              granted_by: grantedBy,
              expires_at: expiresAt?.toISOString(),
              granted_at: new Date().toISOString(),
            })
          )
          .execute()
      )
      .pipe(
        Effect.orElseFail<AuthorizationError>(
          () =>
            new AuthorizationError({
              cause: 'grantFlag',
              message: 'Failed to grant flag',
            })
        )
      );
  }).pipe(Effect.provide(DatabaseLive));

const revokeFlag: IAuthorizationService['revokeFlag'] = (
  memberEmail: string,
  flagId: string
) =>
  Effect.gen(function* () {
    // Find member by email
    const db = yield* DatabaseService;
    const member = yield* db
      .query((database) =>
        database
          .selectFrom('members')
          .select(['id', 'email'])
          .where('email', '=', memberEmail)
          .executeTakeFirst()
      )
      .pipe(
        Effect.orElseFail<AuthorizationError>(
          () =>
            new AuthorizationError({
              cause: 'revokeFlag',
              message: 'user not found',
            })
        )
      );

    const id = member?.id;
    if (!id) {
      yield* Effect.fail(
        new AuthorizationError({
          cause: 'revokeFlag',
          message: 'user not found',
        })
      );
      return;
    }

    // Remove flag
    yield* db
      .query((database) =>
        database
          .deleteFrom('members_flags')
          .where('member_id', '=', id.toString())
          .where('flag_id', '=', flagId)
          .execute()
      )
      .pipe(
        Effect.orElseFail<AuthorizationError>(
          () =>
            new AuthorizationError({
              cause: 'revokeFlag',
              message: 'members_flag not found',
            })
        )
      );
    return;
  }).pipe(Effect.provide(DatabaseLive));

const memberHasFlag: IAuthorizationService['memberHasFlag'] = (
  memberEmail: string,
  flagId: string
) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    return yield* db
      .query((database) =>
        database
          .selectFrom('members')
          .innerJoin('members_flags', 'members.id', 'members_flags.member_id')
          .select('members_flags.flag_id')
          .where('members.email', '=', memberEmail)
          .where('members_flags.flag_id', '=', flagId)
          .where((eb: any) =>
            eb.or([
              eb('members_flags.expires_at', 'is', null),
              eb('members_flags.expires_at', '>', new Date().toISOString()),
            ])
          )
          .executeTakeFirst()
      )
      .pipe(
        Effect.map((row: any) => Boolean(row)),
        Effect.mapError(
          (error) =>
            new AuthorizationError({
              cause: error,
              message: 'Failed to check member flag',
            })
        )
      );
  }).pipe(Effect.provide(DatabaseLive));

// AuthorizationService using Effect.Tag pattern
export class AuthorizationService extends Effect.Tag('AuthorizationService')<
  AuthorizationService,
  IAuthorizationService
>() {
  // Live implementation that depends on DatabaseService
  static Live: Layer.Layer<AuthorizationService, never, never> = Layer.succeed(
    AuthorizationService,
    {
      checkPermission,
      buildAbilityForUser,
      getUserFlags,
      grantFlag,
      revokeFlag,
      memberHasFlag,
    }
  );
}
