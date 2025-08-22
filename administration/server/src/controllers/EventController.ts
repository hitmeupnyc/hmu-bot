import { Effect } from 'effect';
import type { Request, Response } from 'express';
import { EventService } from '../services/effect/EventEffects';
import { extractId } from '../services/effect/adapters/expressAdapter';
import {
  CreateEvent,
  CreateEventMarketing,
  CreateVolunteer,
  UpdateEvent,
} from '../services/effect/schemas/EventSchemas';
import {
  createPaginatedResponse,
  createSuccessResponse,
} from './helpers/responseFormatters';

/**
 * Event Controller
 *
 * Handles all event-related business logic and orchestrates calls to EventEffects.
 * All functions return Effects for composability with the existing Effect-TS infrastructure.
 */

// =====================================
// Basic Event Operations
// =====================================

/**
 * List events with pagination and filtering
 * GET /api/events
 */
export const listEvents = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const query = req.query;
    const page = parseInt((query.page as string) || '1');
    const limit = parseInt((query.limit as string) || '20');
    const upcoming = query.upcoming === 'true';

    const eventService = yield* EventService;
    const result = yield* eventService.getEvents({ page, limit, upcoming });

    return createPaginatedResponse(result.events, result.pagination);
  });

/**
 * Get a single event by ID
 * GET /api/events/:id
 */
export const getEvent = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const id = yield* extractId(req);
    const eventService = yield* EventService;
    const event = yield* eventService.getEventById(id);

    return createSuccessResponse(event);
  });

/**
 * Get event with all related data (marketing, volunteers, attendance)
 * GET /api/events/:id/details
 */
export const getEventDetails = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const id = yield* extractId(req);
    const eventService = yield* EventService;
    const eventDetails = yield* eventService.getEventWithDetails(id);

    return createSuccessResponse(eventDetails);
  });

/**
 * Create a new event
 * POST /api/events
 */
export const createEvent = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const eventData = req.body as CreateEvent;
    // Ensure flags has a default value (bitfield for active state)
    const eventWithFlags = { ...eventData, flags: eventData.flags ?? 1 };
    const eventService = yield* EventService;
    const event = yield* eventService.createEvent(eventWithFlags);

    res.status(201);
    return createSuccessResponse(event, 'Event created successfully');
  });

/**
 * Update an existing event
 * PUT /api/events/:id
 */
export const updateEvent = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const id = yield* extractId(req);
    const eventData = req.body as Partial<UpdateEvent>;

    const updatePayload = { ...eventData, id };
    const eventService = yield* EventService;
    const event = yield* eventService.updateEvent(updatePayload);

    return createSuccessResponse(event, 'Event updated successfully');
  });

// =====================================
// Event Marketing Operations
// =====================================

/**
 * Get marketing data for an event
 * GET /api/events/:id/marketing
 */
export const getEventMarketing = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const id = yield* extractId(req);
    const eventService = yield* EventService;
    const marketing = yield* eventService.getEventMarketing(id);

    return createSuccessResponse(marketing);
  });

/**
 * Create marketing data for an event
 * POST /api/events/:id/marketing
 */
export const createEventMarketing = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const eventId = yield* extractId(req);
    const bodyData = req.body as CreateEventMarketing;

    const eventService = yield* EventService;
    const marketing = yield* eventService.createEventMarketing(bodyData);

    res.status(201);
    return createSuccessResponse(
      marketing,
      'Event marketing created successfully'
    );
  });

// =====================================
// Event Volunteer Operations
// =====================================

/**
 * Get volunteers for an event
 * GET /api/events/:id/volunteers
 */
export const getEventVolunteers = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const id = yield* extractId(req);
    const eventService = yield* EventService;
    const volunteers = yield* eventService.getEventVolunteers(id);

    return createSuccessResponse(volunteers);
  });

/**
 * Add a volunteer to an event
 * POST /api/events/:id/volunteers
 */
export const createVolunteer = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const eventId = yield* extractId(req);
    const bodyData = req.body as CreateVolunteer;

    const eventService = yield* EventService;
    const volunteer = yield* eventService.createVolunteer(bodyData);

    res.status(201);
    return createSuccessResponse(volunteer, 'Volunteer added successfully');
  });
