import { Router } from 'express';
import { EventService } from '../services/EventService';
import { asyncHandler } from '../middleware/errorHandler';
import { CreateEventRequest } from '../types';

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

// POST /api/events - Create new event
router.post('/', asyncHandler(async (req, res) => {
  const eventData: CreateEventRequest = req.body;
  const event = await eventService.createEvent(eventData);
  
  res.status(201).json({
    success: true,
    data: event,
    message: 'Event created successfully'
  });
}));

// GET /api/events/:id/attendance - Get event attendance
router.get('/:id/attendance', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const attendance = await eventService.getEventAttendance(id);
  
  res.json({
    success: true,
    data: attendance
  });
}));

// POST /api/events/:id/checkin - Check in member to event
router.post('/:id/checkin', asyncHandler(async (req, res) => {
  const eventId = parseInt(req.params.id);
  const { member_id } = req.body;
  
  const attendance = await eventService.checkInMember(eventId, member_id);
  
  res.json({
    success: true,
    data: attendance,
    message: 'Member checked in successfully'
  });
}));

export { router as eventRoutes };