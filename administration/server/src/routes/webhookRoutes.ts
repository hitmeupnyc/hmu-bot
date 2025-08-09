import { Effect } from 'effect';
import { Router } from 'express';
import * as WebhookEffects from '../services/effect/WebhookEffects';
import { effectToExpress } from '../services/effect/adapters/expressAdapter';

const router = Router();

// POST /api/webhooks/eventbrite - Eventbrite webhook handler
router.post(
  '/eventbrite',
  effectToExpress((req, res) =>
    Effect.gen(function* () {
      const result = yield* WebhookEffects.handleEventbriteWebhook(
        req.body,
        req.headers as Record<string, any>
      );
      return { success: true };
    })
  )
);

// POST /api/webhooks/patreon - Patreon webhook handler
router.post(
  '/patreon',
  effectToExpress((req, res) =>
    Effect.gen(function* () {
      const result = yield* WebhookEffects.handlePatreonWebhook(
        req.body,
        req.headers as Record<string, any>
      );
      return { success: true };
    })
  )
);

// POST /api/webhooks/klaviyo - Klaviyo webhook handler
router.post(
  '/klaviyo',
  effectToExpress((req, res) =>
    Effect.gen(function* () {
      const result = yield* WebhookEffects.handleKlaviyoWebhook(
        req.body,
        req.headers as Record<string, any>
      );
      return { success: true };
    })
  )
);

export { router as webhookRoutes };