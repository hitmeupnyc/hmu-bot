import { HttpApiBuilder } from '@effect/platform';
import { Effect } from 'effect';
import { ParseError as InternalParseError } from 'effect/ParseResult';
import { EventService, EventServiceLive } from '~/services/effect/EventEffects';
import { NotFoundError, ParseError, UniqueError } from '~/services/effect/errors/CommonErrors';
import { eventsApi } from './endpoints';

export const EventsApiLive = HttpApiBuilder.group(
  eventsApi,
  'events',
  (handlers) =>
    Effect.gen(function* () {
      const eventService = yield* EventService;

      return handlers
        .handle('api.events.list', ({ urlParams }) =>
          Effect.gen(function* () {
            const page = urlParams.page ?? 1;
            const limit = urlParams.limit ?? 20;
            const search = urlParams.search;

            const result = yield* eventService.getEvents({
              page,
              limit,
              search,
            });

            return {
              data: result.events,
              total: result.pagination.total,
              page: result.pagination.page,
              limit: result.pagination.limit,
              totalPages: result.pagination.totalPages,
            };
          })
        )

        .handle('api.events.read', ({ path }) =>
          Effect.gen(function* () {
            const event = yield* eventService.getEventById(path.id).pipe(
              Effect.mapError((error) => {
                if (error instanceof NotFoundError) {
                  return new NotFoundError({
                    id: path.id.toString(),
                    resource: 'event',
                  });
                }
                throw error;
              })
            );
            return event;
          })
        )

        .handle('api.events.create', ({ payload }) =>
          Effect.gen(function* () {
            const event = yield* eventService.createEvent(payload).pipe(
              Effect.mapError((error) => {
                if (error instanceof UniqueError) {
                  return new UniqueError({
                    field: 'name',
                    value: payload.name,
                  });
                }
                throw error;
              })
            );
            return event;
          })
        )

        .handle('api.events.update', ({ path, payload }) =>
          Effect.gen(function* () {
            const event = yield* eventService.updateEvent({
              ...payload,
              id: path.id,
            });
            return event;
          }).pipe(
            Effect.mapError((error) => {
              if (error instanceof InternalParseError) {
                return new ParseError(error);
              }
              throw error;
            })
          )
        )

        .handle('api.events.delete', ({ path }) =>
          Effect.gen(function* () {
            // For now, return an error since delete is not implemented
            return yield* Effect.fail(
              new NotFoundError({
                id: path.id.toString(),
                resource: 'event',
              })
            );
          })
        );
    }).pipe(Effect.provide(EventServiceLive))
);
