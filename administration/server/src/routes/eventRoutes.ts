import { Router } from 'express';
import * as EventController from '../controllers/EventController';
import { auditMiddleware } from '../middleware/auditLogging';
import { effectToExpress } from '../services/effect/adapters/expressAdapter';

/**
 * Event Routes
 *
 * Defines all event-related API endpoints including:
 * - Basic CRUD operations for events
 * - Event marketing management
 * - Volunteer coordination
 * - Attendance tracking
 *
 * All business logic is delegated to EventController.
 */

const router = Router();

// =====================================
// Basic Event Operations
// =====================================

// GET /api/events - List all events with pagination and filtering
router.get('/', effectToExpress(EventController.listEvents));

// GET /api/events/:id - Get single event
router.get('/:id', effectToExpress(EventController.getEvent));

// GET /api/events/:id/details - Get event with all related data
router.get('/:id/details', effectToExpress(EventController.getEventDetails));

// POST /api/events - Create new event
router.post('/', effectToExpress(EventController.createEvent));

// PUT /api/events/:id - Update existing event
router.put(
  '/:id',
  auditMiddleware('event'),
  effectToExpress(EventController.updateEvent)
);

// =====================================
// Event Marketing Operations
// =====================================

// GET /api/events/:id/marketing - Get event marketing
router.get(
  '/:id/marketing',
  effectToExpress(EventController.getEventMarketing)
);

// POST /api/events/:id/marketing - Create event marketing
router.post(
  '/:id/marketing',
  auditMiddleware('event-marketing'),
  effectToExpress(EventController.createEventMarketing)
);

// =====================================
// Event Volunteer Operations
// =====================================

// GET /api/events/:id/volunteers - Get event volunteers
router.get(
  '/:id/volunteers',
  effectToExpress(EventController.getEventVolunteers)
);

// POST /api/events/:id/volunteers - Add volunteer to event
router.post(
  '/:id/volunteers',
  auditMiddleware('event-volunteers'),
  effectToExpress(EventController.createVolunteer)
);

export { router as eventRoutes };
