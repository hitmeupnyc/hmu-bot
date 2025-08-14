import { Router } from 'express';
import * as EventController from '../controllers/EventController';
import { auditMiddleware } from '../middleware/auditLogging';
import { requireAuth, requirePermission, requireEventManager } from '../middleware/auth';
import { effectToExpress } from '../services/effect/adapters/expressAdapter';

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
router.get(
  '/',
  requireAuth,
  requirePermission('read', 'Event'),
  effectToExpress(EventController.listEvents)
);

// GET /api/events/:id - Get single event
// Requires: read permission on Event
router.get(
  '/:id',
  requireAuth,
  requirePermission('read', 'Event'),
  effectToExpress(EventController.getEvent)
);

// GET /api/events/:id/details - Get event with all related data
// Requires: read permission on Event
router.get(
  '/:id/details',
  requireAuth,
  requirePermission('read', 'Event'),
  effectToExpress(EventController.getEventDetails)
);

// POST /api/events - Create new event
// Requires: create permission on Event
router.post(
  '/',
  requireAuth,
  requireEventManager,
  effectToExpress(EventController.createEvent)
);

// PUT /api/events/:id - Update existing event
// Requires: update permission on Event
router.put(
  '/:id',
  requireAuth,
  requirePermission('update', 'Event'),
  auditMiddleware('event'),
  effectToExpress(EventController.updateEvent)
);

// =====================================
// Event Marketing Operations
// =====================================

// GET /api/events/:id/marketing - Get event marketing
// Requires: view permission on event
router.get(
  '/:id/marketing',
  requireAuth,
  requirePermission(
    (req) => ({ objectType: 'event', objectId: req.params.id }),
    'view'
  ),
  effectToExpress(EventController.getEventMarketing)
);

// POST /api/events/:id/marketing - Create event marketing
// Requires: edit permission on event
router.post(
  '/:id/marketing',
  requireAuth,
  requirePermission(
    (req) => ({ objectType: 'event', objectId: req.params.id }),
    'edit'
  ),
  auditMiddleware('event-marketing'),
  effectToExpress(EventController.createEventMarketing)
);

// =====================================
// Event Volunteer Operations
// =====================================

// GET /api/events/:id/volunteers - Get event volunteers
// Requires: manage_volunteers permission on event
router.get(
  '/:id/volunteers',
  requireAuth,
  requirePermission(
    (req) => ({ objectType: 'event', objectId: req.params.id }),
    'volunteer_for'
  ),
  effectToExpress(EventController.getEventVolunteers)
);

// POST /api/events/:id/volunteers - Add volunteer to event
// Requires: volunteer_for permission on event (for self) or manage_volunteers (for others)
router.post(
  '/:id/volunteers',
  requireAuth,
  requirePermission(
    (req) => ({ objectType: 'event', objectId: req.params.id }),
    'manage_volunteers'
  ),
  auditMiddleware('event-volunteers'),
  effectToExpress(EventController.createVolunteer)
);

export { router as eventRoutes };
