import axios from 'axios';
import { Effect, pipe } from 'effect';
import * as Schema from 'effect/Schema';
import * as BaseSyncEffects from './BaseSyncEffects';
import { DatabaseService } from './context/DatabaseService';
import { Event } from './schemas/EventSchemas';

// Eventbrite API schemas
export const EventbriteAttendeeSchema = Schema.Struct({
  id: Schema.String,
  created: Schema.String,
  changed: Schema.String,
  ticket_class_id: Schema.String,
  event_id: Schema.String,
  order_id: Schema.String,
  profile: Schema.Struct({
    first_name: Schema.String,
    last_name: Schema.String,
    email: Schema.String,
    name: Schema.String,
    addresses: Schema.optional(
      Schema.Struct({
        home: Schema.optional(
          Schema.Struct({
            city: Schema.optional(Schema.String),
            country: Schema.optional(Schema.String),
            region: Schema.optional(Schema.String),
          })
        ),
      })
    ),
  }),
  barcodes: Schema.optional(
    Schema.Array(
      Schema.Struct({
        barcode: Schema.String,
        status: Schema.String,
      })
    )
  ),
  checked_in: Schema.Boolean,
  cancelled: Schema.Boolean,
  refunded: Schema.Boolean,
  status: Schema.String,
});

export type EventbriteAttendee = typeof EventbriteAttendeeSchema.Type;

export const EventbriteEventSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.Struct({
    text: Schema.String,
  }),
  description: Schema.Struct({
    text: Schema.String,
  }),
  start: Schema.Struct({
    timezone: Schema.String,
    local: Schema.String,
    utc: Schema.String,
  }),
  end: Schema.Struct({
    timezone: Schema.String,
    local: Schema.String,
    utc: Schema.String,
  }),
  url: Schema.String,
  capacity: Schema.optional(Schema.Number),
  status: Schema.String,
  created: Schema.String,
  changed: Schema.String,
  published: Schema.String,
  organizer_id: Schema.String,
});

export type EventbriteEvent = typeof EventbriteEventSchema.Type;

export const EventbriteWebhookPayloadSchema = Schema.Struct({
  api_url: Schema.String,
  config: Schema.Struct({
    action: Schema.String,
    user_id: Schema.String,
    endpoint_url: Schema.String,
    webhook_id: Schema.String,
  }),
});

export type EventbriteWebhookPayload =
  typeof EventbriteWebhookPayloadSchema.Type;

// Error types
export class EventbriteError {
  readonly _tag = 'EventbriteError';
  constructor(
    readonly message: string,
    readonly eventId?: string
  ) {}
}

// Eventbrite API client configuration
const createEventbriteClient = () =>
  Effect.gen(function* () {
    const token = process.env.EVENTBRITE_API_TOKEN;
    if (!token) {
      return yield* Effect.fail(
        new EventbriteError('Eventbrite API token not configured')
      );
    }

    return axios.create({
      baseURL: 'https://www.eventbriteapi.com/v3',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  });

// Helper to extract ID from Eventbrite URL
const extractIdFromUrl = (url: string): string | undefined => {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? match[1] : undefined;
};

// Find event by Eventbrite ID
const findEventByEventbriteId = (eventbriteId: string) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    const event = yield* db.query(async (db) =>
      db
        .selectFrom('events')
        .selectAll()
        .where('eventbrite_id', '=', eventbriteId)
        .executeTakeFirst()
    );

    return event as Event | undefined;
  });

// Create event from Eventbrite data
const createEventFromEventbrite = (eventData: EventbriteEvent) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    const eventRecord = {
      name: eventData.name.text,
      description: eventData.description?.text || null,
      start_datetime: eventData.start.utc,
      end_datetime: eventData.end.utc,
      flags: 3, // Active and public by default
      eventbrite_id: eventData.id,
      eventbrite_url: eventData.url,
      max_capacity: eventData.capacity || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = yield* db.query(async (db) =>
      db
        .insertInto('events')
        .values(eventRecord)
        .returning('id')
        .executeTakeFirstOrThrow()
    );

    const newEvent = yield* db.query(async (db) =>
      db
        .selectFrom('events')
        .selectAll()
        .where('id', '=', result.id)
        .executeTakeFirstOrThrow()
    );

    return newEvent;
  });

// Update existing event from Eventbrite data
const updateExistingEvent = (
  existingEvent: Event,
  eventData: EventbriteEvent
) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    yield* db.query(async (db) =>
      db
        .updateTable('events')
        .set({
          name: eventData.name.text,
          description: eventData.description?.text || null,
          start_datetime: eventData.start.utc,
          end_datetime: eventData.end.utc,
          eventbrite_url: eventData.url,
          max_capacity: eventData.capacity || null,
          updated_at: new Date().toISOString(),
        })
        .where('id', '=', existingEvent.id)
        .execute()
    );

    const updatedEvent = yield* db.query(async (db) =>
      db
        .selectFrom('events')
        .selectAll()
        .where('id', '=', existingEvent.id)
        .executeTakeFirstOrThrow()
    );

    return updatedEvent;
  });

// Sync Eventbrite event
export const syncEvent = (eventData: EventbriteEvent) =>
  Effect.gen(function* () {
    const validatedEvent = yield* Schema.decodeUnknown(EventbriteEventSchema)(
      eventData
    );

    const existingEvent = yield* findEventByEventbriteId(validatedEvent.id);

    if (existingEvent) {
      return yield* updateExistingEvent(existingEvent, validatedEvent);
    } else {
      return yield* createEventFromEventbrite(validatedEvent);
    }
  });

// Process Eventbrite order
const processOrder = (orderUrl: string) =>
  Effect.gen(function* () {
    const client = yield* createEventbriteClient();

    const orderResponse = yield* Effect.tryPromise({
      try: () =>
        client.get(orderUrl.replace('https://www.eventbriteapi.com/v3', '')),
      catch: (error) =>
        new EventbriteError(`Failed to fetch order: ${String(error)}`),
    });

    const order = orderResponse.data;

    // Get attendees for this order
    const attendeesResponse = yield* Effect.tryPromise({
      try: () => client.get(`/orders/${order.id}/attendees/`),
      catch: (error) =>
        new EventbriteError(`Failed to fetch attendees: ${String(error)}`),
    });

    const attendees: EventbriteAttendee[] = attendeesResponse.data.attendees;

    return { orderProcessed: order.id, attendeesCount: attendees.length };
  });

// Process event
const processEvent = (eventUrl: string) =>
  Effect.gen(function* () {
    const client = yield* createEventbriteClient();

    const response = yield* Effect.tryPromise({
      try: () =>
        client.get(eventUrl.replace('https://www.eventbriteapi.com/v3', '')),
      catch: (error) =>
        new EventbriteError(`Failed to fetch event: ${String(error)}`),
    });

    const eventData: EventbriteEvent = response.data;

    return yield* syncEvent(eventData);
  });

// Handle Eventbrite webhook
export const handleWebhook = (payload: EventbriteWebhookPayload) =>
  Effect.gen(function* () {
    const validatedPayload = yield* Schema.decodeUnknown(
      EventbriteWebhookPayloadSchema
    )(payload);
    const { action } = validatedPayload.config;
    const { api_url } = validatedPayload;

    // Create sync operation
    const syncOperation = yield* BaseSyncEffects.createSyncOperation({
      platform: 'eventbrite',
      operation_type: 'webhook',
      external_id: extractIdFromUrl(api_url) || 'unknown',
      status: 'pending',
      payload_json: JSON.stringify(validatedPayload),
    });

    try {
      let result;

      switch (action) {
        case 'order.placed':
        case 'order.updated':
          result = yield* processOrder(api_url);
          break;

        case 'event.published':
        case 'event.updated':
          result = yield* processEvent(api_url);
          break;

        default:
          yield* BaseSyncEffects.updateSyncOperation(
            syncOperation.id!,
            'success',
            'Webhook received but no action needed'
          );
          return { processed: false, action };
      }

      yield* BaseSyncEffects.updateSyncOperation(
        syncOperation.id!,
        'success',
        'Webhook processed successfully'
      );

      return { processed: true, action, result };
    } catch (error) {
      yield* BaseSyncEffects.updateSyncOperation(
        syncOperation.id!,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );

      return yield* Effect.fail(error);
    }
  });

// Bulk sync events
export const bulkSyncEvents = (organizerId?: string) =>
  Effect.gen(function* () {
    const client = yield* createEventbriteClient();
    let synced = 0;
    let errors = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const params: any = {
        expand: 'ticket_availability',
        status: 'live,started,ended',
        page: page,
      };

      if (organizerId) {
        params['organizer.id'] = organizerId;
      }

      const response = yield* Effect.tryPromise({
        try: () => client.get('/events/', { params }),
        catch: (error) =>
          new EventbriteError(`Failed to fetch events: ${String(error)}`),
      });

      const events: EventbriteEvent[] = response.data.events;

      // Process events in parallel
      const results = yield* Effect.forEach(
        events,
        (event) =>
          pipe(
            BaseSyncEffects.createSyncOperation({
              platform: 'eventbrite',
              operation_type: 'bulk_sync',
              external_id: event.id,
              status: 'pending',
              payload_json: JSON.stringify(event),
            }),
            Effect.flatMap((syncOp) =>
              pipe(
                syncEvent(event),
                Effect.tap(() =>
                  BaseSyncEffects.updateSyncOperation(
                    syncOp.id!,
                    'success',
                    'Event synced'
                  )
                ),
                Effect.map(() => ({ success: true })),
                Effect.catchAll((error) =>
                  pipe(
                    BaseSyncEffects.updateSyncOperation(
                      syncOp.id!,
                      'failed',
                      error instanceof Error ? error.message : 'Unknown error'
                    ),
                    Effect.map(() => ({ success: false }))
                  )
                )
              )
            )
          ),
        { concurrency: 10 }
      );

      results.forEach((result) => {
        if (result.success) {
          synced++;
        } else {
          errors++;
        }
      });

      hasMore = response.data.pagination.has_more_items;
      page++;
    }

    return { synced, errors };
  });

// Bulk sync with default organization
export const bulkSync = (organizerId?: string) => bulkSyncEvents(organizerId);
