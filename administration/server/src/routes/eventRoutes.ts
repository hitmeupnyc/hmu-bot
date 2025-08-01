import { Router } from 'express';
import { EventService } from '../services/EventService';
import { asyncHandler } from '../middleware/errorHandler';
import type { CreateEventPayload, CreateEventMarketingPayload, CreateVolunteerPayload, CreateAttendancePayload } from '../types/events';

const router = Router();
const eventService = new EventService();

// GET /api/events - List all events
router.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const upcoming = req.query.upcoming === 'true';

  const result = await eventService.getEvents({ page, limit, upcoming });
  
  res.json({
    success: true,
    data: result.events,
    pagination: result.pagination
  });
}));

// GET /api/events/:id - Get single event
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const event = await eventService.getEventById(id);
  
  res.json({
    success: true,
    data: event
  });
}));

// GET /api/events/:id/details - Get event with all related data
router.get('/:id/details', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const eventDetails = await eventService.getEventWithDetails(id);
  
  res.json({
    success: true,
    data: eventDetails
  });
}));

// POST /api/events - Create new event
router.post('/', asyncHandler(async (req, res) => {
  const eventData: CreateEventPayload = req.body;
  const event = await eventService.createEvent(eventData);
  
  res.status(201).json({
    success: true,
    data: event,
    message: 'Event created successfully'
  });
}));

// Marketing routes
// GET /api/events/:id/marketing - Get event marketing
router.get('/:id/marketing', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const marketing = await eventService.getEventMarketing(id);
  
  res.json({
    success: true,
    data: marketing
  });
}));

// POST /api/events/:id/marketing - Create event marketing
router.post('/:id/marketing', asyncHandler(async (req, res) => {
  const eventId = parseInt(req.params.id);
  const marketingData: CreateEventMarketingPayload = { ...req.body, event_id: eventId };
  const marketing = await eventService.createEventMarketing(marketingData);
  
  res.status(201).json({
    success: true,
    data: marketing,
    message: 'Event marketing created successfully'
  });
}));

// Volunteer routes
// GET /api/events/:id/volunteers - Get event volunteers
router.get('/:id/volunteers', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const volunteers = await eventService.getEventVolunteers(id);
  
  res.json({
    success: true,
    data: volunteers
  });
}));

// POST /api/events/:id/volunteers - Add volunteer to event
router.post('/:id/volunteers', asyncHandler(async (req, res) => {
  const eventId = parseInt(req.params.id);
  const volunteerData: CreateVolunteerPayload = { ...req.body, event_id: eventId };
  const volunteer = await eventService.createVolunteer(volunteerData);
  
  res.status(201).json({
    success: true,
    data: volunteer,
    message: 'Volunteer added successfully'
  });
}));

// Attendance routes
// GET /api/events/:id/attendance - Get event attendance
router.get('/:id/attendance', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const attendance = await eventService.getEventAttendance(id);
  
  res.json({
    success: true,
    data: attendance
  });
}));

// POST /api/events/:id/attendance - Create attendance record
router.post('/:id/attendance', asyncHandler(async (req, res) => {
  const eventId = parseInt(req.params.id);
  const attendanceData: CreateAttendancePayload = { ...req.body, event_id: eventId };
  const attendance = await eventService.createAttendance(attendanceData);
  
  res.status(201).json({
    success: true,
    data: attendance,
    message: 'Attendance record created successfully'
  });
}));

// PUT /api/events/attendance/:id/checkin - Check in attendee
router.put('/attendance/:id/checkin', asyncHandler(async (req, res) => {
  const attendanceId = parseInt(req.params.id);
  const { check_in_method } = req.body;
  
  const attendance = await eventService.checkInAttendee(attendanceId, check_in_method);
  
  res.json({
    success: true,
    data: attendance,
    message: 'Attendee checked in successfully'
  });
}));

// Legacy route for backward compatibility
// POST /api/events/:id/checkin - Check in member to event (legacy)
router.post('/:id/checkin', asyncHandler(async (req, res) => {
  const eventId = parseInt(req.params.id);
  const { member_id } = req.body;
  
  // Create attendance record and check in
  const attendanceData: CreateAttendancePayload = {
    event_id: eventId,
    member_id,
    attendance_source: 1, // Manual
    check_in_method: 'manual'
  };
  
  const attendance = await eventService.createAttendance(attendanceData);
  const attendanceId = typeof attendance.id === 'number' ? attendance.id : parseInt(attendance.id as string);
  const checkedIn = await eventService.checkInAttendee(attendanceId, 'manual');
  
  res.json({
    success: true,
    data: checkedIn,
    message: 'Member checked in successfully'
  });
}));

export { router as eventRoutes };