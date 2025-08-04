import { Router } from 'express';
import { WebhookService } from '../services/WebhookService';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const webhookService = new WebhookService();

// POST /api/webhooks/eventbrite - Eventbrite webhook handler
router.post('/eventbrite', asyncHandler(async (req, res) => {
  await webhookService.handleEventbriteWebhook(req.body, req.headers);
  
  res.status(200).json({ success: true });
}));

// POST /api/webhooks/patreon - Patreon webhook handler
router.post('/patreon', asyncHandler(async (req, res) => {
  await webhookService.handlePatreonWebhook(req.body, req.headers);
  
  res.status(200).json({ success: true });
}));

// POST /api/webhooks/klaviyo - Klaviyo webhook handler
router.post('/klaviyo', asyncHandler(async (req, res) => {
  await webhookService.handleKlaviyoWebhook(req.body, req.headers);
  
  res.status(200).json({ success: true });
}));

export { router as webhookRoutes };