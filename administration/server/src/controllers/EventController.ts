import { Effect } from 'effect';
import type { Request, Response } from 'express';
import * as EventEffects from '../services/effect/EventEffects';
import {
  extractBody,
  extractId,
  extractQuery,
} from '../services/effect/adapters/expressAdapter';
import {
  CreateAttendance,
  CreateEvent,
  CreateEventMarketing,
  CreateVolunteer,
  UpdateEvent,
} from '../services/effect/schemas/EventSchemas';
import {
  createPaginatedResponse,
  createSuccessResponse,
  createSuccessResponseWithMessage,
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
    const query = yield* extractQuery(req);
    const page = parseInt((query as any).page) || 1;
    const limit = parseInt((query as any).limit) || 20;
    const upcoming = (query as any).upcoming === 'true';

    const result = yield* EventEffects.getEvents({ page, limit, upcoming });

    return createPaginatedResponse(result.events, result.pagination);
  });

/**
 * Get a single event by ID
 * GET /api/events/:id
 */
export const getEvent = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const id = yield* extractId(req);
    const event = yield* EventEffects.getEventById(id);

    return createSuccessResponse(event);
  });

/**
 * Get event with all related data (marketing, volunteers, attendance)
 * GET /api/events/:id/details
 */
export const getEventDetails = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const id = yield* extractId(req);
    const eventDetails = yield* EventEffects.getEventWithDetails(id);

    return createSuccessResponse(eventDetails);
  });

/**
 * Create a new event
 * POST /api/events
 */
export const createEvent = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const eventData = yield* extractBody<CreateEvent>(req);
    // Ensure flags has a default value (bitfield for active state)
    const eventWithFlags = { ...eventData, flags: eventData.flags ?? 1 };
    const event = yield* EventEffects.createEvent(eventWithFlags);

    res.status(201);
    return createSuccessResponseWithMessage(
      event,
      'Event created successfully'
    );
  });

/**
 * Update an existing event
 * PUT /api/events/:id
 */
export const updateEvent = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const id = yield* extractId(req);
    const eventData = yield* extractBody<Partial<UpdateEvent>>(req);

    const updatePayload = { ...eventData, id };
    const event = yield* EventEffects.updateEvent(updatePayload);

    return createSuccessResponseWithMessage(
      event,
      'Event updated successfully'
    );
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
    const marketing = yield* EventEffects.getEventMarketing(id);

    return createSuccessResponse(marketing);
  });

/**
 * Create marketing data for an event
 * POST /api/events/:id/marketing
 */
export const createEventMarketing = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const eventId = yield* extractId(req);
    const bodyData = yield* extractBody<CreateEventMarketing>(req);

    const marketing = yield* EventEffects.createEventMarketing(bodyData);

    res.status(201);
    return createSuccessResponseWithMessage(
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
    const volunteers = yield* EventEffects.getEventVolunteers(id);

    return createSuccessResponse(volunteers);
  });

/**
 * Add a volunteer to an event
 * POST /api/events/:id/volunteers
 */
export const createVolunteer = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const eventId = yield* extractId(req);
    const bodyData = yield* extractBody<CreateVolunteer>(req);

    const volunteer = yield* EventEffects.createVolunteer(bodyData);

    res.status(201);
    return createSuccessResponseWithMessage(
      volunteer,
      'Volunteer added successfully'
    );
  });

// =====================================
// Event Attendance Operations
// =====================================

/**
 * Get attendance records for an event
 * GET /api/events/:id/attendance
 */
export const getEventAttendance = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const id = yield* extractId(req);
    const attendance = yield* EventEffects.getEventAttendance(id);

    return createSuccessResponse(attendance);
  });

/**
 * Create an attendance record for an event
 * POST /api/events/:id/attendance
 */
export const createAttendance = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const eventId = yield* extractId(req);
    const bodyData = yield* extractBody<CreateAttendance>(req);
    const attendanceData = {
      ...bodyData,
      event_id: eventId,
      attendance_source: bodyData.attendance_source ?? 1, // Default to manual
    };
    const attendance = yield* EventEffects.createAttendance(attendanceData);

    res.status(201);
    return createSuccessResponseWithMessage(
      attendance,
      'Attendance record created successfully'
    );
  });

/**
 * Check in an attendee
 * PUT /api/events/attendance/:id/checkin
 */
export const checkInAttendee = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const attendanceId = yield* extractId(req);
    const bodyData = yield* extractBody<{ check_in_method: string }>(req);

    const attendance = yield* EventEffects.checkInAttendee(
      attendanceId,
      bodyData.check_in_method
    );

    return createSuccessResponseWithMessage(
      attendance,
      'Attendee checked in successfully'
    );
  });

// =====================================
// Legacy Compatibility Operations
// =====================================

/**
 * Check in member to event (legacy endpoint)
 * POST /api/events/:id/checkin
 *
 * @deprecated This endpoint combines attendance creation and check-in.
 * New implementations should use separate attendance creation and check-in endpoints.
 */
export const legacyCheckInMember = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const eventId = yield* extractId(req);
    const bodyData = yield* extractBody<{ member_id: number }>(req);

    // Create attendance record and check in
    const attendanceData = {
      event_id: eventId,
      member_id: bodyData.member_id,
      attendance_source: 1, // Manual
      check_in_method: 'manual',
    };

    const attendance = yield* EventEffects.createAttendance(attendanceData);
    if (!attendance.id) {
      return yield* Effect.fail(
        new Error('Failed to create attendance record')
      );
    }
    const checkedIn = yield* EventEffects.checkInAttendee(
      attendance.id!,
      'manual'
    );

    return createSuccessResponseWithMessage(
      checkedIn,
      'Member checked in successfully'
    );
  });
