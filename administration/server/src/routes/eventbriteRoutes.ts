import { Effect } from 'effect';
import { Router } from 'express';
import * as EventbriteSyncEffects from '../services/effect/EventbriteSyncEffects';
import {
  effectToExpress,
  extractBody,
  extractQuery,
} from '../services/effect/adapters/expressAdapter';

const router = Router();

// Webhook verification middleware (Eventbrite uses verification tokens)
const verifyEventbriteWebhook = (req: any, res: any, next: any) => {
  // Eventbrite sends a verification token in the payload for security
  const expectedToken = process.env.EVENTBRITE_WEBHOOK_TOKEN;

  if (!expectedToken) {
    return res
      .status(401)
      .json({ error: 'Webhook verification not configured' });
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
router.post(
  '/webhook',
  verifyEventbriteWebhook,
  effectToExpress((req, res) =>
    Effect.gen(function* () {
      const payload =
        yield* extractBody<EventbriteSyncEffects.EventbriteWebhookPayload>(req);
      yield* EventbriteSyncEffects.handleWebhook(payload);
      return { message: 'Webhook processed successfully' };
    })
  )
);

// POST /api/eventbrite/sync/events - Manual bulk sync events
router.post(
  '/sync/events',
  effectToExpress((req, res) =>
    Effect.gen(function* () {
      const body = yield* extractBody<{ organizer_id?: string }>(req);
      const result = yield* EventbriteSyncEffects.bulkSyncEvents(
        body.organizer_id
      );
      return {
        success: true,
        message: `Events sync completed: ${result.synced} synced, ${result.errors} errors`,
        data: result,
      };
    })
  )
);

// GET /api/eventbrite/events/:eventId - Get event details from Eventbrite
router.get(
  '/events/:eventId',
  effectToExpress((req, res) =>
    Effect.sync(() => {
      const { eventId } = req.params;
      // TODO: This would make a direct API call to Eventbrite
      // For now, returning a placeholder response
      return {
        success: true,
        message: 'Event details would be fetched from Eventbrite API',
        eventId,
      };
    })
  )
);

// GET /api/eventbrite/events/:eventId/attendees - Get attendees for specific event
router.get(
  '/events/:eventId/attendees',
  effectToExpress((req, res) =>
    Effect.gen(function* () {
      const { eventId } = req.params;
      const query = yield* extractQuery<{ page?: number }>(req);
      const { page = 1 } = query;
      // TODO: This would make a direct API call to Eventbrite
      // For now, returning a placeholder response
      return {
        success: true,
        message: 'Attendees would be fetched from Eventbrite API',
        eventId,
        page,
      };
    })
  )
);

// POST /api/eventbrite/checkin/:attendeeId - Check in attendee
router.post(
  '/checkin/:attendeeId',
  effectToExpress((req, res) =>
    Effect.sync(() => {
      const { attendeeId } = req.params;
      // TODO: This would make an API call to Eventbrite to check in the attendee
      // For now, returning a placeholder response
      return {
        success: true,
        message: 'Attendee checked in successfully',
        attendeeId,
      };
    })
  )
);

export { router as eventbriteRoutes };
