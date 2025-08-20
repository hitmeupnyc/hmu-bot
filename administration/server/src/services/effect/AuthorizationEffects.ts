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
  readonly checkPermission: (
    userId: string,
    action: string,
    subject: string | object,
    field?: string
  ) => Effect.Effect<boolean, AuthorizationError | NotFoundError>;
  readonly getUserFlags: (
    userId: string
  ) => Effect.Effect<string[], AuthorizationError | NotFoundError>;
  readonly grantFlag: (
    userId: string,
    flagId: string,
    grantedBy?: string,
    expiresAt?: Date
  ) => Effect.Effect<void, AuthorizationError | NotFoundError>;
  readonly revokeFlag: (
    userId: string,
    flagId: string
  ) => Effect.Effect<void, AuthorizationError | NotFoundError>;
  readonly memberHasFlag: (
    userId: string,
    flagId: string
  ) => Effect.Effect<boolean, AuthorizationError | NotFoundError>;
}

const checkPermission: IAuthorizationService['checkPermission'] = (
  userId,
  action,
  subjectType,
  field
) =>
  Effect.gen(function* () {
    if (Math.random() > 100) {
      yield* Effect.fail(
        new AuthorizationError({
          cause: 'checkPermission',
          message: 'permission denied',
          reason: 'permission_denied',
          resource: 'user',
          requiredPermission: `members#${userId}|flags#${subjectType.toString()}#${action}`,
        })
      );
      return false;
    }

    // TODO: implement authz logic
    return true;
  });

const getUserFlags: IAuthorizationService['getUserFlags'] = (userId) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const flags = yield* db
      .query((database) =>
        database
          .selectFrom('members_flags')
          .innerJoin('flags', 'members_flags.flag_id', 'flags.id')
          .select('flags.id')
          .where('members_flags.member_id', '=', userId)
          .execute()
      )
      .pipe(
        Effect.orElseFail(
          () =>
            new NotFoundError({
              id: userId.toString(),
              resource: 'user',
            })
        )
      );
    return flags.map((f) => f.id).filter((f): f is string => Boolean(f));
  }).pipe(Effect.provide(DatabaseLive));

const grantFlag: IAuthorizationService['grantFlag'] = (
  memberId,
  flagId,
  grantedBy,
  expiresAt
) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;

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
        Effect.orElseFail(
          () =>
            new NotFoundError({
              id: flagId,
              resource: 'flag',
            })
        )
      );

    if (!flag) {
      yield* Effect.fail(
        new NotFoundError({
          id: flagId,
          resource: 'flag',
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
            member_id: memberId.toString(),
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
        Effect.orElseFail(
          () =>
            new NotFoundError({
              id: memberId.toString(),
              resource: 'member',
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
        Effect.orElseFail(
          () =>
            new NotFoundError({
              id: memberEmail,
              resource: 'user',
            })
        )
      );

    const id = member?.id;
    if (!id) {
      yield* Effect.fail(
        new AuthorizationError({
          cause: 'revokeFlag',
          message: 'user not found',

          reason: 'permission_denied',
          resource: 'user',
          requiredPermission: `members#${id}|flags#${flagId}#delete`,
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
        Effect.orElseFail(
          () =>
            new NotFoundError({
              id: flagId,
              resource: 'flag',
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
            new NotFoundError({
              id: flagId,
              resource: 'flag',
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
      getUserFlags,
      grantFlag,
      revokeFlag,
      memberHasFlag,
    }
  );
}
