import { Router } from 'express';
import { Effect } from 'effect';
import type { CreateEventPayload, CreateEventMarketingPayload, CreateVolunteerPayload, CreateAttendancePayload } from '../types/events';
import * as EventEffects from '../services/effect/EventEffects';
import { effectToExpress, extractId, extractBody, extractQuery } from '../services/effect/adapters/expressAdapter';

const router = Router();

// GET /api/events - List all events
router.get('/', effectToExpress((req, res) =>
  Effect.gen(function* () {
    const query = yield* extractQuery(req);
    const page = parseInt((query as any).page) || 1;
    const limit = parseInt((query as any).limit) || 20;
    const upcoming = (query as any).upcoming === 'true';

    const result = yield* EventEffects.getEvents({ page, limit, upcoming });
    
    return {
      success: true,
      data: result.events,
      pagination: result.pagination
    };
  })
));

// GET /api/events/:id - Get single event
router.get('/:id', effectToExpress((req, res) =>
  Effect.gen(function* () {
    const id = yield* extractId(req);
    const event = yield* EventEffects.getEventById(id);
    
    return {
      success: true,
      data: event
    };
  })
));

// GET /api/events/:id/details - Get event with all related data
router.get('/:id/details', effectToExpress((req, res) =>
  Effect.gen(function* () {
    const id = yield* extractId(req);
    const eventDetails = yield* EventEffects.getEventWithDetails(id);
    
    return {
      success: true,
      data: eventDetails
    };
  })
));

// POST /api/events - Create new event
router.post('/', effectToExpress((req, res) => {
  res.status(201);
  return Effect.gen(function* () {
    const eventData = yield* extractBody<CreateEventPayload>(req);
    // Ensure flags has a default value
    const eventWithFlags = { ...eventData, flags: eventData.flags ?? 1 }; // Default to active
    const event = yield* EventEffects.createEvent(eventWithFlags);
    
    return {
      success: true,
      data: event,
      message: 'Event created successfully'
    };
  });
}));

// Marketing routes
// GET /api/events/:id/marketing - Get event marketing
router.get('/:id/marketing', effectToExpress((req, res) =>
  Effect.gen(function* () {
    const id = yield* extractId(req);
    const marketing = yield* EventEffects.getEventMarketing(id);
    
    return {
      success: true,
      data: marketing
    };
  })
));

// POST /api/events/:id/marketing - Create event marketing
router.post('/:id/marketing', effectToExpress((req, res) => {
  res.status(201);
  return Effect.gen(function* () {
    const eventId = yield* extractId(req);
    const bodyData = yield* extractBody<CreateEventMarketingPayload>(req);
    
    // Transform marketing_images from MarketingImage[] to string[]
    const transformedData = {
      ...bodyData,
      event_id: eventId,
      marketing_images: bodyData.marketing_images?.map(img => img.url) || undefined
    };
    
    const marketing = yield* EventEffects.createEventMarketing(transformedData);
    
    return {
      success: true,
      data: marketing,
      message: 'Event marketing created successfully'
    };
  });
}));

// Volunteer routes
// GET /api/events/:id/volunteers - Get event volunteers
router.get('/:id/volunteers', effectToExpress((req, res) =>
  Effect.gen(function* () {
    const id = yield* extractId(req);
    const volunteers = yield* EventEffects.getEventVolunteers(id);
    
    return {
      success: true,
      data: volunteers
    };
  })
));

// POST /api/events/:id/volunteers - Add volunteer to event
router.post('/:id/volunteers', effectToExpress((req, res) => {
  res.status(201);
  return Effect.gen(function* () {
    const eventId = yield* extractId(req);
    const bodyData = yield* extractBody<CreateVolunteerPayload>(req);
    
    // Transform complex arrays to simple string arrays
    const transformedData = {
      ...bodyData,
      event_id: eventId,
      equipment_needed: bodyData.equipment_needed?.map(eq => eq.name) || undefined,
      skills_required: bodyData.skills_required?.map(skill => skill.name) || undefined
    };
    
    const volunteer = yield* EventEffects.createVolunteer(transformedData);
    
    return {
      success: true,
      data: volunteer,
      message: 'Volunteer added successfully'
    };
  });
}));

// Attendance routes
// GET /api/events/:id/attendance - Get event attendance
router.get('/:id/attendance', effectToExpress((req, res) =>
  Effect.gen(function* () {
    const id = yield* extractId(req);
    const attendance = yield* EventEffects.getEventAttendance(id);
    
    return {
      success: true,
      data: attendance
    };
  })
));

// POST /api/events/:id/attendance - Create attendance record
router.post('/:id/attendance', effectToExpress((req, res) => {
  res.status(201);
  return Effect.gen(function* () {
    const eventId = yield* extractId(req);
    const bodyData = yield* extractBody<CreateAttendancePayload>(req);
    const attendanceData = { 
      ...bodyData, 
      event_id: eventId,
      attendance_source: bodyData.attendance_source ?? 1 // Default to manual
    };
    const attendance = yield* EventEffects.createAttendance(attendanceData);
    
    return {
      success: true,
      data: attendance,
      message: 'Attendance record created successfully'
    };
  });
}));

// PUT /api/events/attendance/:id/checkin - Check in attendee
router.put('/attendance/:id/checkin', effectToExpress((req, res) =>
  Effect.gen(function* () {
    const attendanceId = yield* extractId(req);
    const bodyData = yield* extractBody<{check_in_method: string}>(req);
    
    const attendance = yield* EventEffects.checkInAttendee(attendanceId, bodyData.check_in_method);
    
    return {
      success: true,
      data: attendance,
      message: 'Attendee checked in successfully'
    };
  })
));

// Legacy route for backward compatibility
// POST /api/events/:id/checkin - Check in member to event (legacy)
router.post('/:id/checkin', effectToExpress((req, res) =>
  Effect.gen(function* () {
    const eventId = yield* extractId(req);
    const bodyData = yield* extractBody<{member_id: number}>(req);
    
    // Create attendance record and check in
    const attendanceData = {
      event_id: eventId,
      member_id: bodyData.member_id,
      attendance_source: 1, // Manual
      check_in_method: 'manual'
    };
    
    const attendance = yield* EventEffects.createAttendance(attendanceData);
    if (!attendance.id) {
      return yield* Effect.fail(new Error('Failed to create attendance record'));
    }
    const checkedIn = yield* EventEffects.checkInAttendee(attendance.id!, 'manual');
    
    return {
      success: true,
      data: checkedIn,
      message: 'Member checked in successfully'
    };
  })
));

export { router as eventRoutes };