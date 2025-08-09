import crypto from 'crypto';
import { Effect } from 'effect';
import { Router } from 'express';
import * as KlaviyoSyncEffects from '../services/effect/KlaviyoSyncEffects';
import {
  effectToExpress,
  extractBody,
} from '../services/effect/adapters/expressAdapter';

const router = Router();

// Webhook signature verification middleware
const verifyKlaviyoSignature = (req: any, res: any, next: any) => {
  const signature = req.headers['x-klaviyo-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!signature || !process.env.KLAVIYO_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.KLAVIYO_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
};

// POST /api/klaviyo/webhook - Handle Klaviyo webhooks
router.post(
  '/webhook',
  verifyKlaviyoSignature,
  effectToExpress((req, res) =>
    Effect.gen(function* () {
      const payload = yield* extractBody<KlaviyoSyncEffects.KlaviyoWebhookPayload>(req);
      yield* KlaviyoSyncEffects.handleKlaviyoWebhook(payload);
      return { message: 'Webhook processed successfully' };
    })
  )
);

// POST /api/klaviyo/sync - Manual bulk sync
router.post(
  '/sync',
  effectToExpress((req, res) =>
    Effect.gen(function* () {
      const result = yield* KlaviyoSyncEffects.bulkSyncKlaviyoProfiles();
      return {
        success: true,
        message: `Sync completed: ${result.synced} synced, ${result.errors} errors`,
        data: result,
      };
    })
  )
);

// GET /api/klaviyo/profile/:email - Get profile by email
router.get(
  '/profile/:email',
  effectToExpress((req, res) =>
    Effect.gen(function* () {
      const { email } = req.params;
      // For now, returning a placeholder as getProfileByEmail is not in Effects
      return {
        success: true,
        message: 'Profile lookup would be fetched from Klaviyo API',
        email,
      };
    })
  )
);

// POST /api/klaviyo/push/:memberId - Push member to Klaviyo
router.post(
  '/push/:memberId',
  effectToExpress((req, res) =>
    Effect.gen(function* () {
      const memberId = parseInt(req.params.memberId);
      // For now, returning a placeholder as individual push is not in Effects
      return {
        success: true,
        message: 'Member would be pushed to Klaviyo',
        memberId,
      };
    })
  )
);

export { router as klaviyoRoutes };
