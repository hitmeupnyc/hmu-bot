import { HttpApiBuilder } from '@effect/platform';
import { Effect, Schema } from 'effect';
import { sql } from 'kysely';
import { NotFoundError, UnrecoverableError } from '~/api/errors';
import { EventSchema } from '~/api/events/schemas';
import { DatabaseLive, DatabaseService } from '~/layers/db';
import { eventsApi } from './endpoints';

export const EventsApiLive = HttpApiBuilder.group(
  eventsApi,
  'events',
  (handlers) =>
    Effect.gen(function* () {
      const dbService = yield* DatabaseService;

      return handlers
        .handle('api.events.list', ({ urlParams }) =>
          Effect.gen(function* () {
            const page = urlParams.page ?? 1;
            const limit = urlParams.limit ?? 20;
            const upcoming = urlParams.upcoming ?? true;
            const offset = (page - 1) * limit;

            const [countResult, events] = yield* dbService.query(async (db) => {
              let query = db
                .selectFrom('events')
                .selectAll()
                .where((eb) => eb('flags', '&', 1), '=', 1); // Only active events

              if (upcoming) {
                query = query.where(
                  'start_datetime',
                  '>',
                  sql<string>`datetime('now')`
                );
              }

              const countQuery = query
                .clearSelect()
                .select((eb) => eb.fn.count('id').as('total'));

              return Promise.all([
                countQuery.executeTakeFirst() as Promise<{ total: string }>,
                query
                  .orderBy('start_datetime', 'asc')
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

        .handle('api.events.read', ({ path }) =>
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

        .handle('api.events.create', ({ payload }) =>
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

        .handle('api.events.update', ({ path, payload }) =>
          Effect.gen(function* () {
            const result = yield* dbService.query(async (db) =>
              db
                .updateTable('events')
                .set({ ...payload, updated_at: new Date().toISOString() })
                .where('id', '=', path.id)
                .returningAll()
                .execute()
            );

            return yield* Schema.decodeUnknown(EventSchema)(result).pipe(
              Effect.orDie
            );
          })
        )

        .handle('api.events.delete', ({ path }) =>
          Effect.gen(function* () {
            yield* dbService.query(async (db) =>
              db.deleteFrom('events').where('id', '=', path.id).execute()
            );
          })
        );
    }).pipe(Effect.provide(DatabaseLive))
);
