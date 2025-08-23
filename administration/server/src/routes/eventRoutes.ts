import { Schema } from 'effect';
import { Effect } from 'effect/index';
import { Router } from 'express';
import { EventService } from '~/services/effect/EventEffects';
import {
  useParsedBody,
  useParsedParams,
  useParsedQuery,
} from '~/services/effect/http';
import {
  CreateEvent,
  CreateEventMarketing,
  CreateVolunteer,
  EventSchema,
  UpdateEvent,
} from '~/services/effect/schemas/EventSchemas';
import { auditMiddleware } from '../middleware/auditLogging';
import { withExpress } from '../services/effect/adapters/expressAdapter';
import {
  IdParamSchema,
  paginatedOutput,
  parseParams,
  requireAuth,
  requirePermission,
} from '../services/effect/http';

/**
 * Event Routes
 *
 * Defines all event-related API endpoints including:
 * - Basic CRUD operations for events
 * - Event marketing management
 * - Volunteer coordination
 *
 * All business logic is delegated to EventController.
 */

const router = Router();

// =====================================
// Basic Event Operations
// =====================================

// GET /api/events - List all events with pagination and filtering
// Requires: read permission on Event
router.get('/', (req, res, next) =>
  Effect.void.pipe(
    withExpress(req, res, next),
    requireAuth(),
    requirePermission('read', 'events'),
    Effect.flatMap(() =>
      Effect.gen(function* () {
        const { upcoming } = yield* useParsedQuery<{ upcoming: boolean }>();
        const { page, limit } = yield* useParsedQuery<{
          page: number;
          limit: number;
        }>();

        const eventService = yield* EventService;
        return yield* eventService.getEvents({ page, limit, upcoming });
      })
    ),
    paginatedOutput(Schema.Array(EventSchema))
  )
);

// GET /api/events/:id - Get single event
// Requires: read permission on Event
router.get('/:id', (req, res, next) =>
  Effect.void.pipe(
    withExpress(req, res, next),
    requireAuth(),
    parseParams(IdParamSchema),
    requirePermission('read', ({ params: { id } }) => ({ type: 'events', id })),
    Effect.map(() =>
      Effect.gen(function* () {
        const { id } = yield* useParsedParams<{ id: number }>();
        const eventService = yield* EventService;
        return yield* eventService.getEventById(id);
      })
    ),
    paginatedOutput(Schema.Array(EventSchema))
  )
);

// GET /api/events/:id/details - Get event with all related data
// Requires: read permission on Event
router.get('/:id/details', (req, res, next) =>
  Effect.void.pipe(
    withExpress(req, res, next),
    requireAuth(),
    parseParams(IdParamSchema),
    requirePermission('read', ({ params: { id } }) => ({ type: 'events', id })),
    Effect.flatMap(() =>
      Effect.gen(function* () {
        const { id } = yield* useParsedParams<{ id: number }>();
        const eventService = yield* EventService;
        return yield* eventService.getEventWithDetails(id);
      })
    )
  )
);

// POST /api/events - Create new event
// Requires: create permission on Event
router.post('/', (req, res, next) =>
  Effect.void.pipe(
    withExpress(req, res, next),
    requireAuth(),
    requirePermission('create', 'events'),
    Effect.flatMap(() =>
      Effect.gen(function* () {
        const eventData = yield* useParsedBody<CreateEvent>();
        // Ensure flags has a default value (bitfield for active state)
        const eventWithFlags = { ...eventData, flags: eventData.flags ?? 1 };
        const eventService = yield* EventService;
        return yield* eventService.createEvent(eventWithFlags);
      })
    )
  )
);

// PUT /api/events/:id - Update existing event
// Requires: update permission on Event
router.put('/:id', (req, res, next) =>
  Effect.void.pipe(
    withExpress(req, res, next),
    requireAuth(),
    parseParams(IdParamSchema),
    requirePermission('update', (req) => ({
      type: 'events',
      id: req.params.id,
    })),
    Effect.flatMap(() =>
      Effect.gen(function* () {
        const { id } = yield* useParsedParams<{ id: number }>();
        const eventData = yield* useParsedBody<Partial<UpdateEvent>>();

        const updatePayload = { ...eventData, id };
        const eventService = yield* EventService;
        return yield* eventService.updateEvent(updatePayload);
      })
    ),
    auditMiddleware('event')
  )
);

// =====================================
// Event Marketing Operations
// =====================================

// GET /api/events/:id/marketing - Get event marketing
// Requires: view permission on event
router.get('/:id/marketing', (req, res, next) =>
  Effect.void.pipe(
    withExpress(req, res, next),
    requireAuth(),
    parseParams(IdParamSchema),
    requirePermission('read', (req) => ({ type: 'events', id: req.params.id })),
    Effect.flatMap(() =>
      Effect.gen(function* () {
        const { id } = yield* useParsedParams<{ id: number }>();
        const eventService = yield* EventService;
        return yield* eventService.getEventMarketing(id);
      })
    )
  )
);

// POST /api/events/:id/marketing - Create event marketing
// Requires: update permission on event
router.post('/:id/marketing', (req, res, next) =>
  Effect.void.pipe(
    withExpress(req, res, next),
    requireAuth(),
    parseParams(IdParamSchema),
    requirePermission('update', (req) => ({
      type: 'events',
      id: req.params.id,
    })),
    Effect.flatMap(() =>
      Effect.gen(function* () {
        const eventId = yield* useParsedParams<{ id: number }>();
        const bodyData = yield* useParsedBody<CreateEventMarketing>();

        const eventService = yield* EventService;
        if (eventId.id !== bodyData.event_id) {
          return yield* Effect.fail(
            new Error('Event ID in URL does not match event ID in body')
          );
        }
        return yield* eventService.createEventMarketing(bodyData);
      })
    ),
    auditMiddleware('event-marketing')
  )
);

// =====================================
// Event Volunteer Operations
// =====================================

// GET /api/events/:id/volunteers - Get event volunteers
// Requires: manage_volunteers permission on event
router.get('/:id/volunteers', (req, res, next) =>
  Effect.void.pipe(
    withExpress(req, res, next),
    requireAuth(),
    parseParams(IdParamSchema),
    requirePermission('read', (req) => ({ type: 'events', id: req.params.id })),
    Effect.flatMap(() =>
      Effect.gen(function* () {
        const { id } = yield* useParsedParams<{ id: number }>();
        const eventService = yield* EventService;
        return yield* eventService.getEventVolunteers(id);
      })
    )
  )
);

// POST /api/events/:id/volunteers - Add volunteer to event
// Requires: volunteer_for permission on event (for self) or manage_volunteers (for others)
router.post('/:id/volunteers', (req, res, next) =>
  Effect.void.pipe(
    withExpress(req, res, next),
    requireAuth(),
    parseParams(IdParamSchema),
    requirePermission('create', (req) => ({
      type: 'events',
      id: req.params.id,
    })),
    Effect.flatMap(() =>
      Effect.gen(function* () {
        const eventId = yield* useParsedParams<{ id: number }>();
        const bodyData = yield* useParsedBody<CreateVolunteer>();

        const eventService = yield* EventService;
        return yield* eventService.createVolunteer(bodyData);
      })
    ),
    auditMiddleware('event-volunteers')
  )
);

export { router as eventRoutes };
