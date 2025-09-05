import { HttpApi, HttpApiBuilder } from '@effect/platform';
import { Effect, Schema } from 'effect';
import { CurrentUser } from '~/middleware/auth';
import {
  DatabaseLive,
  DatabaseService,
} from '~/services/effect/layers/DatabaseLayer';
import { flagsGroup } from './endpoints';
import { MemberFlagSchema } from './schemas';

// Create a standalone flags API for the handlers
export const flagsApi = HttpApi.make('FlagsAPI').add(flagsGroup);

export const FlagsApiLive = HttpApiBuilder.group(
  flagsApi,
  'flags',
  (handlers) =>
    Effect.gen(function* () {
      const dbService = yield* DatabaseService;

      return handlers
        .handle('api.flags.list', () =>
          Effect.gen(function* () {
            const flags = yield* dbService
              .query((db) =>
                db.selectFrom('flags').selectAll().orderBy('name').execute()
              )
              .pipe(
                Effect.mapError((error) => {
                  throw error;
                })
              );

            return flags.map((flag) => ({
              id: flag.id || '',
              name: flag.name,
              created_at: flag.created_at
                ? new Date(flag.created_at)
                : new Date(),
              updated_at: flag.updated_at
                ? new Date(flag.updated_at)
                : new Date(),
            }));
          })
        )

        .handle('api.flags.members.list', ({ path }) =>
          Effect.gen(function* () {
            const member = yield* dbService.query((db) =>
              db
                .selectFrom('members')
                .select(['id'])
                .where('id', '=', parseInt(path.id, 10))
                .executeTakeFirst()
            );

            if (!member) {
              return [];
            }

            const flags = yield* dbService.query((db) =>
              db
                .selectFrom('members_flags as mf')
                .innerJoin('flags as f', 'f.id', 'mf.flag_id')
                .select([
                  'f.id',
                  'mf.member_id',
                  'f.name',
                  'mf.granted_at',
                  'mf.expires_at',
                  'mf.granted_by',
                  'mf.metadata',
                ])
                .where('mf.member_id', '=', path.id)
                .execute()
            );

            return yield* Schema.decodeUnknown(Schema.Array(MemberFlagSchema))(
              flags
            ).pipe(Effect.orDie);
          })
        )

        .handle('api.flags.members.grant', ({ path, payload }) =>
          Effect.gen(function* () {
            const currentUser = yield* CurrentUser;

            yield* dbService.query((db) =>
              db.transaction().execute(async (trx) => {
                const existing = await trx
                  .selectFrom('members_flags')
                  .select('member_id')
                  .where('member_id', '=', path.id)
                  .where('flag_id', '=', payload.flag_id)
                  .executeTakeFirst();

                if (existing) {
                  await trx
                    .updateTable('members_flags')
                    .set({
                      member_id: path.id,
                      ...payload,
                      granted_by: currentUser.id,
                    })
                    .where('member_id', '=', path.id)
                    .where('flag_id', '=', payload.flag_id)
                    .execute();
                } else {
                  await trx
                    .insertInto('members_flags')
                    .values({ member_id: path.id, ...payload })
                    .execute();
                }
                // TODO: Audit logging
              })
            );
          })
        )

        .handle('api.flags.members.revoke', ({ path, payload }) =>
          Effect.gen(function* () {
            // TODO: audit logs
            yield* dbService.query((db) =>
              db.transaction().execute(async (trx) => {
                await trx
                  .deleteFrom('members_flags')
                  .where('member_id', '=', path.id)
                  .where('flag_id', '=', path.flagId)
                  .execute();
              })
            );
          })
        )

        .handle('api.flags.flag.members', ({ path }) =>
          Effect.gen(function* () {
            const members = yield* dbService.query((db) =>
              db
                .selectFrom('members_flags as mf')
                // .innerJoin('members as m', 'm.id', 'mf.member_id')
                .select([
                  'mf.flag_id',
                  'mf.member_id',
                  'mf.granted_at',
                  'mf.granted_by',
                  'mf.expires_at',
                  'mf.metadata',
                ])
                .where('mf.flag_id', '=', path.flagId)
                .execute()
            );

            return yield* Schema.decodeUnknown(Schema.Array(MemberFlagSchema))(
              members
            ).pipe(Effect.orDie);
          })
        )

        .handle('api.flags.bulk', ({ payload }) =>
          Effect.gen(function* () {
            const currentUser = yield* CurrentUser;
            const { operations } = payload;
            const results = yield* dbService.query((db) =>
              db.transaction().execute((trx) =>
                Promise.allSettled(
                  operations.map((o) =>
                    trx
                      .insertInto('members_flags')
                      .values({ ...o, granted_by: currentUser.id })
                      .returning(['flag_id', 'member_id'])
                      .executeTakeFirstOrThrow()
                  )
                )
              )
            );
            return operations.map((o, i) => ({
              success: results[i].status === 'fulfilled',
              member_id: o.member_id,
              flag_id: o.flag_id,
            }));
          })
        );
    }).pipe(Effect.provide(DatabaseLive))
);
