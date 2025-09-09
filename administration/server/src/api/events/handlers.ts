import { HttpApiBuilder } from '@effect/platform';
import { Effect, Schema } from 'effect';
import { CurrentUser } from '~/api/auth';
import { NotFoundError, UnrecoverableError } from '~/api/errors';
import { EventFlagSchema, EventSchema } from '~/api/events/schemas';
import { DatabaseLive, DatabaseService } from '~/layers/db';
import { eventsApi } from './endpoints';

export const EventsApiLive = HttpApiBuilder.group(
  eventsApi,
  'events',
  (handlers) =>
    Effect.gen(function* () {
      const dbService = yield* DatabaseService;

      return handlers
        .handle('list', ({ urlParams }) =>
          Effect.gen(function* () {
            const page = urlParams.page ?? 1;
            const limit = urlParams.limit ?? 20;
            const offset = (page - 1) * limit;

            const [countResult, events] = yield* dbService.query(async (db) => {
              let query = db
                .selectFrom('events')
                .selectAll()
                .where((eb) => eb('flags', '&', 1), '=', 1); // Only active events

              const countQuery = query
                .clearSelect()
                .select((eb) => eb.fn.count('id').as('total'));

              return Promise.all([
                countQuery.executeTakeFirst() as Promise<{ total: string }>,
                query
                  .orderBy('id', 'desc') // Order by id since we no longer have datetime fields
                  .limit(limit)
                  .offset(offset)
                  .execute(),
              ]);
            });

            const total = parseInt(countResult?.total || '0');
            const totalPages = Math.ceil(total / limit);

            return {
              data: yield* Schema.decodeUnknown(Schema.Array(EventSchema))(
                events
              ).pipe(Effect.orDie),
              page,
              limit,
              total,
              totalPages,
            };
          })
        )

        .handle('read', ({ path }) =>
          Effect.gen(function* () {
            const { id } = path;
            const event = yield* dbService.query(async (db) =>
              db
                .selectFrom('events')
                .selectAll()
                .where('id', '=', id)
                .where((eb) => eb('flags', '&', 1), '=', 1) // Only active events
                .executeTakeFirst()
            );

            if (!event) {
              throw new NotFoundError({ id: `${id}`, resource: 'event' });
            }

            return yield* Schema.decodeUnknown(EventSchema)(event).pipe(
              Effect.orDie
            );
          })
        )

        .handle('create', ({ payload }) =>
          Effect.gen(function* () {
            const result = yield* dbService.query(async (db) =>
              db
                .insertInto('events')
                .values(payload)
                .returningAll()
                .executeTakeFirstOrThrow()
            );

            if (!result.id) {
              throw new UnrecoverableError({
                message: 'Failed to create event',
                stack: '',
                attributes: { result },
              });
            }

            return yield* Schema.decodeUnknown(EventSchema)(result).pipe(
              Effect.orDie
            );
          })
        )

        .handle('update', ({ path, payload }) =>
          Effect.gen(function* () {
            const result = yield* dbService.query(async (db) =>
              db
                .updateTable('events')
                .set(payload)
                .where('id', '=', path.id)
                .returningAll()
                .executeTakeFirst()
            );

            if (!result) {
              throw new NotFoundError({ id: `${path.id}`, resource: 'event' });
            }

            return yield* Schema.decodeUnknown(EventSchema)(result).pipe(
              Effect.orDie
            );
          })
        )

        .handle('delete', ({ path }) =>
          Effect.gen(function* () {
            yield* dbService.query(async (db) =>
              db.deleteFrom('events').where('id', '=', path.id).execute()
            );
          })
        )

        .handle('flags', ({ path }) =>
          Effect.gen(function* () {
            const flags = yield* dbService.query(async (db) =>
              db
                .selectFrom('events_flags as ef')
                .innerJoin('flags as f', 'f.id', 'ef.flag_id')
                .select([
                  'f.id',
                  'ef.event_id',
                  'f.name',
                  'ef.granted_at',
                  'ef.expires_at',
                  'ef.granted_by',
                  'ef.metadata',
                ])
                .where('ef.event_id', '=', path.id)
                .execute()
            );

            return yield* Schema.decodeUnknown(Schema.Array(EventFlagSchema))(
              flags
            ).pipe(Effect.orDie);
          })
        )

        .handle('grantFlag', ({ path, payload }) =>
          Effect.gen(function* () {
            const currentUser = yield* CurrentUser;

            yield* dbService.query(async (db) =>
              db.transaction().execute(async (trx) => {
                const existing = await trx
                  .selectFrom('events_flags')
                  .select('event_id')
                  .where('event_id', '=', path.id)
                  .where('flag_id', '=', path.flagId)
                  .executeTakeFirst();

                if (existing) {
                  await trx
                    .updateTable('events_flags')
                    .set({
                      event_id: path.id,
                      ...payload,
                      granted_by: currentUser.id,
                    })
                    .where('event_id', '=', path.id)
                    .where('flag_id', '=', path.flagId)
                    .execute();
                } else {
                  await trx
                    .insertInto('events_flags')
                    .values({
                      event_id: path.id,
                      flag_id: path.flagId,
                      granted_by: currentUser.id,
                      ...payload,
                    })
                    .execute();
                }
                // TODO: Audit logging
              })
            );
          })
        )

        .handle('revokeFlag', ({ path }) =>
          Effect.gen(function* () {
            // TODO: audit logs
            yield* dbService.query(async (db) =>
              db.transaction().execute(async (trx) => {
                await trx
                  .deleteFrom('events_flags')
                  .where('event_id', '=', path.id)
                  .where('flag_id', '=', path.flagId)
                  .execute();
              })
            );
          })
        );
    }).pipe(Effect.provide(DatabaseLive))
);
