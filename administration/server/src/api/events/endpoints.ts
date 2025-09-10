import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi,
} from '@effect/platform';
import { Schema } from 'effect';
import { NotFoundError, ParseError, UniqueError } from '~/api/errors';
import { ListQuerySchema } from '~/api/schemas';
import { CreateEventSchema, EventSchema, UpdateEventSchema, EventFlagSchema, GrantEventFlagSchema } from './schemas';

// Events API group
export const eventsGroup = HttpApiGroup.make('events')
  .add(
    HttpApiEndpoint.get('api.events.list', '/api/events')
      .addSuccess(
        Schema.Struct({
          data: Schema.Array(EventSchema),
          total: Schema.Number,
          page: Schema.Number,
          limit: Schema.Number,
          totalPages: Schema.Number,
        })
      )
      .addError(ParseError)
      .setUrlParams(ListQuerySchema)
      .annotate(
        OpenApi.Description,
        'List all events with pagination and search'
      )
  )
  .add(
    HttpApiEndpoint.post('api.events.create', '/api/events')
      .setPayload(CreateEventSchema)
      .addSuccess(EventSchema, { status: 201 })
      .addError(UniqueError)
      .annotate(OpenApi.Description, 'Create a new event')
  )
  .add(
    HttpApiEndpoint.get('api.events.read', '/api/events/:id')
      .setPath(Schema.Struct({ id: Schema.NumberFromString }))
      .addSuccess(EventSchema)
      .addError(NotFoundError)
      .annotate(OpenApi.Description, 'Get an event by ID')
  )
  .add(
    HttpApiEndpoint.put('api.events.update', '/api/events/:id')
      .setPath(Schema.Struct({ id: Schema.NumberFromString }))
      .setPayload(UpdateEventSchema)
      .addSuccess(EventSchema)
      .addError(NotFoundError)
      .addError(ParseError)
      .addError(UniqueError)
      .annotate(OpenApi.Description, 'Update an existing event')
  )
  .add(
    HttpApiEndpoint.del('api.events.delete', '/api/events/:id')
      .setPath(Schema.Struct({ id: Schema.NumberFromString }))
      .addSuccess(Schema.Void)
      .addError(NotFoundError)
      .annotate(OpenApi.Description, 'Delete an event')
  )
  .add(
    HttpApiEndpoint.get('api.events.flags.list', '/api/events/:id/flags')
      .setPath(Schema.Struct({ id: Schema.NumberFromString }))
      .addSuccess(Schema.Array(EventFlagSchema))
      .addError(NotFoundError)
      .annotate(OpenApi.Description, 'List all flags for an event')
  )
  .add(
    HttpApiEndpoint.post('api.events.flags.grant', '/api/events/:id/flags/:flagId')
      .setPath(Schema.Struct({ 
        id: Schema.NumberFromString,
        flagId: Schema.String
      }))
      .setPayload(GrantEventFlagSchema)
      .addSuccess(Schema.Void, { status: 201 })
      .addError(NotFoundError)
      .annotate(OpenApi.Description, 'Grant a flag to an event')
  )
  .add(
    HttpApiEndpoint.del('api.events.flags.revoke', '/api/events/:id/flags/:flagId')
      .setPath(Schema.Struct({ 
        id: Schema.NumberFromString,
        flagId: Schema.String
      }))
      .addSuccess(Schema.Void)
      .addError(NotFoundError)
      .annotate(OpenApi.Description, 'Revoke a flag from an event')
  );

export const eventsApi = HttpApi.make('EventsAPI').add(eventsGroup);
