import { HttpApi, HttpApiBuilder } from '@effect/platform';
import { Effect } from 'effect';
import { CurrentUser } from '~/api/auth';
import { DatabaseLive, DatabaseService } from '~/layers/db';
import { flagsGroup } from './endpoints';

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
