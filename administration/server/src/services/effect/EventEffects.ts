import { Context, Effect, Layer, Schema } from 'effect';
import { sql } from 'kysely';
import {
  DatabaseError,
  NotFoundError,
  ParseError,
  UniqueError,
} from './errors/CommonErrors';
import { DatabaseLive, DatabaseService } from './layers/DatabaseLayer';
import {
  CreateEventMarketingSchema,
  CreateEventSchema,
  CreateVolunteerSchema,
  EventMarketingSchema,
  EventQueryOptionsSchema,
  EventSchema,
  EventVolunteerSchema,
  EventWithDetailsSchema,
  UpdateEventSchema,
  type CreateEvent,
  type CreateEventMarketing,
  type CreateVolunteer,
  type EventQueryOptions,
  type EventWithDetails,
  type UpdateEvent,
} from './schemas/EventSchemas';

// Service interface
export interface IEventService {
  readonly getEvents: (options: EventQueryOptions) => Effect.Effect<
    {
      events: (typeof EventSchema.Type)[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    },
    ParseError | DatabaseError | ParseError,
    never
  >;

  readonly getEventById: (
    id: number
  ) => Effect.Effect<
    typeof EventSchema.Type,
    NotFoundError | DatabaseError | ParseError,
    never
  >;

  readonly createEvent: (
    data: CreateEvent
  ) => Effect.Effect<
    typeof EventSchema.Type,
    ParseError | DatabaseError | ParseError,
    never
  >;

  readonly updateEvent: (
    data: UpdateEvent
  ) => Effect.Effect<
    typeof EventSchema.Type,
    NotFoundError | ParseError | DatabaseError | ParseError,
    never
  >;

  readonly getEventWithDetails: (
    id: number
  ) => Effect.Effect<
    EventWithDetails,
    NotFoundError | DatabaseError | ParseError,
    never
  >;

  readonly getEventMarketing: (
    eventId: number
  ) => Effect.Effect<
    typeof EventMarketingSchema.Type | null,
    NotFoundError | DatabaseError | ParseError,
    never
  >;

  readonly createEventMarketing: (
    data: CreateEventMarketing
  ) => Effect.Effect<
    typeof EventMarketingSchema.Type,
    ParseError | UniqueError | DatabaseError | ParseError,
    never
  >;

  readonly getEventVolunteers: (
    eventId: number
  ) => Effect.Effect<
    (typeof EventVolunteerSchema.Type)[],
    NotFoundError | DatabaseError | ParseError,
    never
  >;

  readonly createVolunteer: (
    data: CreateVolunteer
  ) => Effect.Effect<
    void,
    ParseError | UniqueError | DatabaseError | ParseError,
    never
  >;
}

export const EventService = Context.GenericTag<IEventService>('EventService');

// Service implementation layer
export const EventServiceLive = Layer.effect(
  EventService,
  Effect.gen(function* () {
    const dbService = yield* DatabaseService;

    const getEvents = (
      options: EventQueryOptions
    ): Effect.Effect<
      {
        events: (typeof EventSchema.Type)[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      },
      ParseError | DatabaseError | ParseError,
      never
    > =>
      Effect.gen(function* () {
        const validatedOptions = yield* Schema.decodeUnknown(
          EventQueryOptionsSchema
        )(options);

        const { page, limit, upcoming } = validatedOptions;
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

        const eventRows = yield* Effect.forEach(events, (event) =>
          Schema.decodeUnknown(EventSchema)(event)
        );

        const total = parseInt(countResult?.total || '0');
        const totalPages = Math.ceil(total / limit);

        return {
          events: eventRows,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        };
      });

    const getEventById = (
      id: number
    ): Effect.Effect<
      typeof EventSchema.Type,
      NotFoundError | DatabaseError | ParseError,
      never
    > =>
      Effect.gen(function* () {
        const event = yield* dbService.query(async (db) =>
          db
            .selectFrom('events')
            .selectAll()
            .where('id', '=', id)
            .where((eb) => eb('flags', '&', 1), '=', 1) // Only active events
            .executeTakeFirst()
        );

        if (!event) {
          return yield* new NotFoundError({
            id: id.toString(),
            resource: 'event',
          });
        }

        return yield* Schema.decodeUnknown(EventSchema)(event);
      });

    const createEvent = (
      data: CreateEvent
    ): Effect.Effect<
      typeof EventSchema.Type,
      ParseError | DatabaseError | ParseError,
      never
    > =>
      Effect.gen(function* () {
        const validatedData =
          yield* Schema.decodeUnknown(CreateEventSchema)(data);

        const result = yield* dbService.query(async (db) =>
          db
            .insertInto('events')
            .values({
              name: validatedData.name,
              description: validatedData.description || null,
              start_datetime: validatedData.start_datetime,
              end_datetime: validatedData.end_datetime,
              flags: validatedData.flags,
              max_capacity: validatedData.max_capacity || null,
              eventbrite_id: validatedData.eventbrite_id || null,
              eventbrite_url: validatedData.eventbrite_url || null,
            })
            .returning('id')
            .executeTakeFirstOrThrow()
        );

        if (!result.id) {
          return yield* new DatabaseError({
            message: 'Failed to create event',
          });
        }

        return yield* getEventById(result.id);
      }).pipe(
        Effect.mapError((error) => {
          if (error._tag === 'NotFoundError') {
            return new DatabaseError({
              message: 'Failed to create event',
            });
          }
          return error;
        })
      );

    const updateEvent = (
      data: UpdateEvent
    ): Effect.Effect<
      typeof EventSchema.Type,
      NotFoundError | ParseError | DatabaseError | ParseError,
      never
    > =>
      Effect.gen(function* () {
        const validatedData =
          yield* Schema.decodeUnknown(UpdateEventSchema)(data);

        // Ensure event exists
        yield* getEventById(validatedData.id);

        const updateData: Record<string, any> = {};

        if (validatedData.name !== undefined) {
          updateData.name = validatedData.name;
        }
        if (validatedData.description !== undefined) {
          updateData.description = validatedData.description;
        }
        if (validatedData.start_datetime !== undefined) {
          updateData.start_datetime = validatedData.start_datetime;
        }
        if (validatedData.end_datetime !== undefined) {
          updateData.end_datetime = validatedData.end_datetime;
        }
        if (validatedData.max_capacity !== undefined) {
          updateData.max_capacity = validatedData.max_capacity;
        }
        if (validatedData.eventbrite_id !== undefined) {
          updateData.eventbrite_id = validatedData.eventbrite_id;
        }
        if (validatedData.eventbrite_url !== undefined) {
          updateData.eventbrite_url = validatedData.eventbrite_url;
        }

        updateData.updated_at = new Date().toISOString();

        yield* dbService.query(async (db) =>
          db
            .updateTable('events')
            .set(updateData)
            .where('id', '=', validatedData.id)
            .execute()
        );

        return yield* getEventById(validatedData.id);
      });

    const getEventWithDetails = (
      id: number
    ): Effect.Effect<
      EventWithDetails,
      NotFoundError | DatabaseError | ParseError,
      never
    > =>
      Effect.gen(function* () {
        const event = yield* getEventById(id);

        const [marketing, volunteers] = yield* Effect.all([
          getEventMarketing(id),
          getEventVolunteers(id),
        ]);

        const eventWithDetails: EventWithDetails = {
          event,
          marketing: marketing || undefined,
          volunteers,
          // TODO: Add eventbrite_event and eventbrite_link when needed
          eventbrite_event: undefined,
          eventbrite_link: undefined,
        };

        return yield* Schema.decodeUnknown(EventWithDetailsSchema)(
          eventWithDetails
        );
      });

    const getEventMarketing = (
      eventId: number
    ): Effect.Effect<
      typeof EventMarketingSchema.Type | null,
      NotFoundError | DatabaseError | ParseError,
      never
    > =>
      Effect.gen(function* () {
        const result = yield* dbService.query(async (db) =>
          db
            .selectFrom('events_marketing')
            .selectAll()
            .where('event_id', '=', eventId)
            .executeTakeFirst()
        );

        if (!result) {
          return null;
        }

        return yield* Schema.decodeUnknown(EventMarketingSchema)(result);
      });

    const createEventMarketing = (
      data: CreateEventMarketing
    ): Effect.Effect<
      typeof EventMarketingSchema.Type,
      ParseError | UniqueError | DatabaseError | ParseError,
      never
    > =>
      Effect.gen(function* () {
        const validatedData = yield* Schema.decodeUnknown(
          CreateEventMarketingSchema
        )(data);

        // Validate event exists
        yield* getEventById(validatedData.event_id);

        // Check if marketing already exists
        const existingMarketing = yield* getEventMarketing(
          validatedData.event_id
        );
        if (existingMarketing) {
          return yield* new UniqueError({
            field: 'createEventMarketing',
            value: validatedData.event_id.toString(),
          });
        }

        const result = yield* dbService.query(async (db) =>
          db
            .insertInto('events_marketing')
            .values({
              ...validatedData,
              hashtags: validatedData.hashtags?.join(','),
              key_selling_points: validatedData.key_selling_points?.join(','),
              marketing_images_json: JSON.stringify(
                validatedData.marketing_images || []
              ),
            })
            .returning('id')
            .executeTakeFirstOrThrow()
        );

        const marketing = yield* dbService.query(async (db) =>
          db
            .selectFrom('events_marketing')
            .selectAll()
            .where('id', '=', result.id!)
            .executeTakeFirstOrThrow()
        );

        return yield* Schema.decodeUnknown(EventMarketingSchema)(marketing);
      }).pipe(
        Effect.mapError((error) => {
          if (error._tag === 'NotFoundError') {
            return new DatabaseError({
              message: 'Failed to create event marketing',
            });
          }
          return error;
        })
      );

    const getEventVolunteers = (
      eventId: number
    ): Effect.Effect<
      (typeof EventVolunteerSchema.Type)[],
      NotFoundError | DatabaseError | ParseError,
      never
    > =>
      Effect.gen(function* () {
        const volunteers = yield* dbService.query(async (db) =>
          db
            .selectFrom('events_volunteers')
            .selectAll()
            .where('event_id', '=', eventId)
            .execute()
        );

        return yield* Effect.forEach(volunteers, (volunteer) =>
          Schema.decodeUnknown(EventVolunteerSchema)(volunteer)
        );
      });

    const createVolunteer = (
      data: CreateVolunteer
    ): Effect.Effect<
      void,
      ParseError | UniqueError | DatabaseError | ParseError,
      never
    > =>
      Effect.gen(function* () {
        const validatedData = yield* Schema.decodeUnknown(
          CreateVolunteerSchema
        )(data);

        // Validate event exists
        yield* getEventById(validatedData.event_id);

        // Check if volunteer already exists for this event/member combination
        const existingVolunteer = yield* dbService.query(async (db) =>
          db
            .selectFrom('events_volunteers')
            .select('id')
            .where('event_id', '=', validatedData.event_id)
            .where('member_id', '=', validatedData.member_id)
            .executeTakeFirst()
        );

        if (existingVolunteer) {
          return yield* new UniqueError({
            field: 'createVolunteer',
            value: `${validatedData.event_id}-${validatedData.member_id}`,
          });
        }

        yield* dbService.query(async (db) =>
          db
            .insertInto('events_volunteers')
            .values({
              event_id: validatedData.event_id,
              member_id: validatedData.member_id,
              role: validatedData.role,
            })
            .execute()
        );
      }).pipe(
        Effect.catchTag(
          'NotFoundError',
          (error) =>
            new DatabaseError({ message: 'Failed to create event volunteer' })
        )
      );

    return {
      getEvents,
      getEventById,
      createEvent,
      updateEvent,
      getEventWithDetails,
      getEventMarketing,
      createEventMarketing,
      getEventVolunteers,
      createVolunteer,
    } satisfies IEventService;
  })
).pipe(Layer.provide(DatabaseLive));

// Factory function for layer
export const getEventServiceLayer = () => EventServiceLive;
