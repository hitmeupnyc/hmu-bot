import { Effect, Schema } from 'effect';
import { sql } from 'kysely';
import { DatabaseService } from './context/DatabaseService';
import {
  EventMarketingError,
  EventNotFound,
  EventValidationError,
  VolunteerError,
} from './errors/EventErrors';
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

/**
 * Internal helper to get event by ID without external validation
 */
const getEventByIdInternal = (id: number) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    const event = yield* db.query(async (db) =>
      db
        .selectFrom('events')
        .selectAll()
        .where('id', '=', id)
        .where((eb) => eb('flags', '&', 1), '=', 1) // Only active events
        .executeTakeFirst()
    );

    if (!event) {
      return yield* new EventNotFound({ eventId: id });
    }

    return yield* Schema.decodeUnknown(EventSchema)(event);
  });

/**
 * Get paginated events with optional upcoming filter
 */
export const getEvents = (options: EventQueryOptions) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const validatedOptions = yield* Schema.decodeUnknown(
      EventQueryOptionsSchema
    )(options);

    const { page, limit, upcoming } = validatedOptions;
    const offset = (page - 1) * limit;

    const [countResult, events] = yield* db.query(async (db) => {
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
  }).pipe(
    Effect.mapError((error) =>
      error._tag === 'ParseError'
        ? new EventValidationError({
            field: 'query_options',
            message: `Invalid query options: ${error.message}`,
          })
        : error
    )
  );

/**
 * Get event by ID
 */
export const getEventById = (id: number) => getEventByIdInternal(id);

/**
 * Create a new event
 */
export const createEvent = (data: CreateEvent) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const validatedData = yield* Schema.decodeUnknown(CreateEventSchema)(data);

    const result = yield* db.query(async (db) =>
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

    return yield* getEventByIdInternal(result.id!);
  }).pipe(
    Effect.mapError((error) =>
      error._tag === 'ParseError'
        ? new EventValidationError({
            field: 'event_data',
            message: `Invalid event data: ${error.message}`,
          })
        : error
    )
  );

/**
 * Update an existing event
 */
export const updateEvent = (data: UpdateEvent) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const validatedData = yield* Schema.decodeUnknown(UpdateEventSchema)(data);

    // Ensure event exists before updating
    yield* getEventByIdInternal(validatedData.id);

    // Build update object with only provided fields
    const updateData: Partial<{
      name: string;
      description: string | null;
      start_datetime: string;
      end_datetime: string;
      flags: number;
      max_capacity: number | null;
      eventbrite_id: string | null;
      eventbrite_url: string | null;
    }> = {};

    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined)
      updateData.description = validatedData.description || null;
    if (validatedData.start_datetime !== undefined)
      updateData.start_datetime = validatedData.start_datetime;
    if (validatedData.end_datetime !== undefined)
      updateData.end_datetime = validatedData.end_datetime;
    if (validatedData.flags !== undefined)
      updateData.flags = validatedData.flags;
    if (validatedData.max_capacity !== undefined)
      updateData.max_capacity = validatedData.max_capacity || null;
    if (validatedData.eventbrite_id !== undefined)
      updateData.eventbrite_id = validatedData.eventbrite_id || null;
    if (validatedData.eventbrite_url !== undefined)
      updateData.eventbrite_url = validatedData.eventbrite_url || null;

    yield* db.query(async (db) =>
      db
        .updateTable('events')
        .set(updateData)
        .where('id', '=', validatedData.id)
        .where((eb) => eb('flags', '&', 1), '=', 1) // Only update active events
        .executeTakeFirstOrThrow()
    );

    return yield* getEventByIdInternal(validatedData.id);
  }).pipe(
    Effect.mapError((error) =>
      error._tag === 'ParseError'
        ? new EventValidationError({
            field: 'event_update_data',
            message: `Invalid event update data: ${error.message}`,
          })
        : error
    )
  );

/**
 * Get event marketing data
 */
export const getEventMarketing = (eventId: number) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    const result = yield* db.query(async (db) =>
      db
        .selectFrom('events_marketing')
        .selectAll()
        .where('event_id', '=', eventId)
        .where((eb) => eb('flags', '&', 1), '=', 1) // Only active
        .executeTakeFirst()
    );

    if (!result) return null;

    return yield* Schema.decodeUnknown(EventMarketingSchema)(result);
  });

/**
 * Create event marketing data
 */
export const createEventMarketing = (data: CreateEventMarketing) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const validatedData = yield* Schema.decodeUnknown(
      CreateEventMarketingSchema
    )(data);

    // Ensure event exists
    yield* getEventByIdInternal(validatedData.event_id);

    const result = yield* db.query(async (db) =>
      db
        .insertInto('events_marketing')
        .values({
          event_id: validatedData.event_id,
          primary_marketing_copy: validatedData.primary_marketing_copy || null,
          secondary_marketing_copy:
            validatedData.secondary_marketing_copy || null,
          blurb: validatedData.blurb || null,
          social_media_copy: validatedData.social_media_copy || null,
          email_subject: validatedData.email_subject || null,
          email_preview_text: validatedData.email_preview_text || null,
          seo_title: validatedData.seo_title || null,
          seo_description: validatedData.seo_description || null,
          hashtags: validatedData.hashtags
            ? JSON.stringify(validatedData.hashtags)
            : null,
          marketing_images_json: validatedData.marketing_images
            ? JSON.stringify(validatedData.marketing_images)
            : null,
          key_selling_points: validatedData.key_selling_points
            ? JSON.stringify(validatedData.key_selling_points)
            : null,
          flags: 1, // Active
        })
        .returning('id')
        .executeTakeFirstOrThrow()
    );

    const marketing = yield* db.query(async (db) =>
      db
        .selectFrom('events_marketing')
        .selectAll()
        .where('id', '=', result.id!)
        .executeTakeFirstOrThrow()
    );

    return yield* Schema.decodeUnknown(EventMarketingSchema)(marketing);
  }).pipe(
    Effect.mapError((error) =>
      error._tag === 'ParseError'
        ? new EventMarketingError({
            eventId: data.event_id,
            message: `Invalid marketing data: ${error.message}`,
          })
        : error
    )
  );

/**
 * Get event volunteers
 */
export const getEventVolunteers = (eventId: number) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    const volunteers = yield* db.query(async (db) =>
      db
        .selectFrom('events_volunteers')
        .selectAll()
        .where('event_id', '=', eventId)
        .where((eb) => eb('flags', '&', 1), '=', 1) // Only active
        .orderBy('role', 'asc')
        .execute()
    );

    return yield* Effect.forEach(volunteers, (volunteer) =>
      Schema.decodeUnknown(EventVolunteerSchema)(volunteer)
    );
  });

/**
 * Create event volunteer
 */
export const createVolunteer = (data: CreateVolunteer) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const validatedData = yield* Schema.decodeUnknown(CreateVolunteerSchema)(
      data
    );

    // Ensure event exists
    yield* getEventByIdInternal(validatedData.event_id);

    const result = yield* db.query(async (db) =>
      db
        .insertInto('events_volunteers')
        .values({
          event_id: validatedData.event_id,
          member_id: validatedData.member_id,
          role: validatedData.role,
          contact_phone: validatedData.contact_phone || null,
          contact_email: validatedData.contact_email || null,
          arrival_time: validatedData.arrival_time || null,
          departure_time: validatedData.departure_time || null,
          special_instructions: validatedData.special_instructions || null,
          equipment_needed: validatedData.equipment_needed
            ? JSON.stringify(validatedData.equipment_needed)
            : null,
          skills_required: validatedData.skills_required
            ? JSON.stringify(validatedData.skills_required)
            : null,
          volunteer_notes: validatedData.volunteer_notes || null,
          flags: 1, // Active
        })
        .returning('id')
        .executeTakeFirstOrThrow()
    );

    const volunteer = yield* db.query(async (db) =>
      db
        .selectFrom('events_volunteers')
        .selectAll()
        .where('id', '=', result.id!)
        .executeTakeFirstOrThrow()
    );

    return yield* Schema.decodeUnknown(EventVolunteerSchema)(volunteer);
  }).pipe(
    Effect.mapError((error) =>
      error._tag === 'ParseError'
        ? new VolunteerError({
            eventId: data.event_id,
            memberId: data.member_id,
            message: `Invalid volunteer data: ${error.message}`,
          })
        : error
    )
  );

/**
 * Get event with all details (marketing, volunteers, etc.)
 */
export const getEventWithDetails = (id: number) =>
  Effect.gen(function* () {
    const event = yield* getEventByIdInternal(id);

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
