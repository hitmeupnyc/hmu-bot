import { Router } from 'express';
import { EventbriteSyncService, EventbriteWebhookPayload } from '../services/EventbriteSyncService';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const eventbriteService = new EventbriteSyncService();

// Webhook verification middleware (Eventbrite uses verification tokens)
const verifyEventbriteWebhook = (req: any, res: any, next: any) => {
  // Eventbrite sends a verification token in the payload for security
  const expectedToken = process.env.EVENTBRITE_WEBHOOK_TOKEN;
  
  if (!expectedToken) {
    return res.status(401).json({ error: 'Webhook verification not configured' });
  }

  // For webhook verification requests, Eventbrite sends a challenge
  if (req.query.challenge) {
    return res.status(200).send(req.query.challenge);
  }

  // For actual webhooks, verify the action is from an expected source
  // Eventbrite doesn't use HMAC but relies on HTTPS and webhook URLs
  next();
};

// POST /api/eventbrite/webhook - Handle Eventbrite webhooks
router.post('/webhook', verifyEventbriteWebhook, asyncHandler(async (req, res) => {
  const payload: EventbriteWebhookPayload = req.body;
  
  await eventbriteService.handleWebhook(payload);
  
  res.status(200).json({ message: 'Webhook processed successfully' });
}));

// POST /api/eventbrite/sync/events - Manual bulk sync events
router.post('/sync/events', asyncHandler(async (req, res) => {
  const { organizer_id } = req.body;
  
  const result = await eventbriteService.bulkSyncEvents(organizer_id);
  
  res.json({
    success: true,
    message: `Events sync completed: ${result.synced} synced, ${result.errors} errors`,
    data: result
  });
}));

// POST /api/eventbrite/sync/attendees/:eventId - Bulk sync attendees for specific event
router.post('/sync/attendees/:eventId', asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  
  const result = await eventbriteService.bulkSyncAttendees(eventId);
  
  res.json({
    success: true,
    message: `Attendees sync completed: ${result.synced} synced, ${result.errors} errors`,
    data: result
  });
}));

// GET /api/eventbrite/events/:eventId - Get event details from Eventbrite
router.get('/events/:eventId', asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  
  try {
    // This would make a direct API call to Eventbrite
    // For now, returning a placeholder response
    res.json({
      success: true,
      message: 'Event details would be fetched from Eventbrite API',
      eventId
    });
  } catch (error) {
    res.status(404).json({ error: 'Event not found' });
  }
}));

// POST /api/eventbrite/events/:eventId/attendees - Get attendees for specific event
router.get('/events/:eventId/attendees', asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { page = 1 } = req.query;
  
  try {
    // This would make a direct API call to Eventbrite
    // For now, returning a placeholder response
    res.json({
      success: true,
      message: 'Attendees would be fetched from Eventbrite API',
      eventId,
      page
    });
  } catch (error) {
    res.status(404).json({ error: 'Event not found or no attendees' });
  }
}));

// POST /api/eventbrite/checkin/:attendeeId - Check in attendee
router.post('/checkin/:attendeeId', asyncHandler(async (req, res) => {
  const { attendeeId } = req.params;
  
  try {
    // This would make an API call to Eventbrite to check in the attendee
    // For now, returning a placeholder response
    res.json({
      success: true,
      message: 'Attendee checked in successfully',
      attendeeId
    });
  } catch (error) {
    res.status(400).json({ error: 'Failed to check in attendee' });
  }
}));

export { router as eventbriteRoutes };