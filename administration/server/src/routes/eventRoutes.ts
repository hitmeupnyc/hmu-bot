import { Effect, Schema } from 'effect';
import { Router } from 'express';
import { EventSchema } from '~/services/effect/schemas/EventSchemas';
import * as EventController from '../controllers/EventController';
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
        const { page, limit } = yield* useParsedQuery<{
          page: number;
          limit: number;
        }>();
        const upcoming = yield* useParsedQuery<{ upcoming: boolean }>();

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
        const id = yield* ParsedParams<{ id: number }>();
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
    EventController.getEventDetails
  )
);

// POST /api/events - Create new event
// Requires: create permission on Event
router.post('/', (req, res, next) =>
  Effect.void.pipe(
    withExpress(req, res, next),
    requireAuth(),
    requirePermission('create', 'events'),
    EventController.createEvent
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
    EventController.updateEvent,
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
    EventController.getEventMarketing
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
    EventController.createEventMarketing,
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
    EventController.getEventVolunteers
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
    EventController.createVolunteer,
    auditMiddleware('event-volunteers')
  )
);

export { router as eventRoutes };
