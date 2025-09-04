import { HttpApi, HttpApiBuilder } from '@effect/platform';
import { Effect } from 'effect';
import { CurrentUser } from '~/middleware/auth';
import {
  NotFoundError,
  ParseError,
} from '~/services/effect/errors/CommonErrors';
import { Flag, FlagLive } from '~/services/effect/layers/FlagLayer';
import { DatabaseLive, DatabaseService } from '~/services/effect/layers/DatabaseLayer';
import { flagsGroup } from './endpoints';

// Create a standalone flags API for the handlers
export const flagsApi = HttpApi.make('FlagsAPI').add(flagsGroup);

export const FlagsApiLive = HttpApiBuilder.group(
  flagsApi,
  'flags',
  (handlers) =>
    Effect.gen(function* () {
      const flagService = yield* Flag;
      const dbService = yield* DatabaseService;

      return handlers
        .handle('api.flags.list', () =>
          Effect.gen(function* () {
            const flags = yield* dbService.query((db) =>
              db.selectFrom('flags').selectAll().orderBy('name').execute()
            ).pipe(
              Effect.mapError((error) => {
                throw error;
              })
            );

            return flags.map(flag => ({
              id: flag.id || '',
              name: flag.name,
              created_at: flag.created_at ? new Date(flag.created_at) : new Date(),
              updated_at: flag.updated_at ? new Date(flag.updated_at) : new Date(),
            }));
          })
        )

        .handle('api.flags.members.list', ({ path }) =>
          Effect.gen(function* () {
            const flags = yield* flagService.getMemberFlags(path.id).pipe(
              Effect.mapError((error) => {
                if (error instanceof NotFoundError) {
                  return new NotFoundError({
                    id: path.id,
                    resource: 'member',
                  });
                }
                throw error;
              })
            );

            return flags.map(flag => ({
              ...flag,
              granted_at: flag.granted_at ? new Date(flag.granted_at) : null,
              expires_at: flag.expires_at ? new Date(flag.expires_at) : null,
            }));
          })
        )

        .handle('api.flags.members.grant', ({ path, payload }) =>
          Effect.gen(function* () {
            const currentUser = yield* CurrentUser;
            
            yield* flagService.grantFlag(path.id, payload.flag_id, {
              grantedBy: currentUser.email,
              expiresAt: payload.expires_at,
              metadata: payload.metadata,
            }).pipe(
              Effect.mapError((error) => {
                if (error instanceof NotFoundError) {
                  return new NotFoundError({
                    id: path.id,
                    resource: 'member or flag',
                  });
                }
                throw error;
              })
            );

            return {
              success: true,
              message: `Flag ${payload.flag_id} granted to ${path.id}`,
            };
          })
        )

        .handle('api.flags.members.revoke', ({ path, payload }) =>
          Effect.gen(function* () {
            const currentUser = yield* CurrentUser;
            
            yield* flagService.revokeFlag(
              path.id,
              path.flagId,
              currentUser.email,
              payload.reason
            ).pipe(
              Effect.mapError((error) => {
                if (error instanceof NotFoundError) {
                  return new NotFoundError({
                    id: `${path.id}/${path.flagId}`,
                    resource: 'member flag assignment',
                  });
                }
                throw error;
              })
            );

            return {
              success: true,
              message: `Flag ${path.flagId} revoked from ${path.id}`,
            };
          })
        )

        .handle('api.flags.flag.members', ({ path }) =>
          Effect.gen(function* () {
            const members = yield* dbService.query((db) =>
              db
                .selectFrom('members_flags as mf')
                .innerJoin('members as m', 'm.id', 'mf.member_id')
                .select([
                  'm.id',
                  'm.email',
                  'm.first_name',
                  'm.last_name',
                  'mf.granted_at',
                  'mf.granted_by',
                  'mf.expires_at',
                ])
                .where('mf.flag_id', '=', path.flagId)
                .execute()
            ).pipe(
              Effect.mapError((error) => {
                throw error;
              })
            );

            return members.map(member => ({
              id: String(member.id || ''),
              email: member.email,
              first_name: member.first_name,
              last_name: member.last_name,
              granted_at: member.granted_at ? new Date(member.granted_at) : null,
              granted_by: member.granted_by,
              expires_at: member.expires_at ? new Date(member.expires_at) : null,
            }));
          })
        )

        .handle('api.flags.bulk', ({ payload }) =>
          Effect.gen(function* () {
            const currentUser = yield* CurrentUser;
            
            const assignments = payload.operations.map((op) => ({
              userId: op.userId,
              flagId: op.flag_id,
              options: {
                grantedBy: currentUser.email,
                expiresAt: op.expires_at,
                metadata: op.metadata,
              },
            }));

            yield* flagService.bulkGrantFlags(assignments).pipe(
              Effect.mapError((error) => {
                if (error instanceof ParseError) {
                  return new ParseError({ message: 'Invalid bulk operations format' });
                }
                throw error;
              })
            );

            return {
              success: true,
              message: `Processed ${payload.operations.length} flag operations`,
            };
          })
        )

        .handle('api.flags.expire', () =>
          Effect.gen(function* () {
            const result = yield* flagService.processExpiredFlags().pipe(
              Effect.mapError((error) => {
                throw error;
              })
            );

            return result;
          })
        );
    }).pipe(
      Effect.provide(FlagLive),
      Effect.provide(DatabaseLive)
    )
);