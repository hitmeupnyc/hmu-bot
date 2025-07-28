import { Router } from 'express';
import { KlaviyoSyncService, KlaviyoWebhookPayload } from '../services/KlaviyoSyncService';
import { asyncHandler } from '../middleware/errorHandler';
import { Member } from '../types';
import { DatabaseService } from '../services/DatabaseService';
import crypto from 'crypto';

const router = Router();
const klaviyoService = new KlaviyoSyncService();

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
router.post('/webhook', verifyKlaviyoSignature, asyncHandler(async (req, res) => {
  const payload: KlaviyoWebhookPayload = req.body;
  
  await klaviyoService.handleWebhook(payload);
  
  res.status(200).json({ message: 'Webhook processed successfully' });
}));

// POST /api/klaviyo/sync - Manual bulk sync
router.post('/sync', asyncHandler(async (req, res) => {
  const { limit = 100 } = req.body;
  
  const result = await klaviyoService.bulkSync(limit);
  
  res.json({
    success: true,
    message: `Sync completed: ${result.synced} synced, ${result.errors} errors`,
    data: result
  });
}));

// GET /api/klaviyo/profile/:email - Get profile by email
router.get('/profile/:email', asyncHandler(async (req, res) => {
  const { email } = req.params;
  
  const profile = await klaviyoService.getProfileByEmail(email);
  
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  
  res.json({
    success: true,
    data: profile
  });
}));

// POST /api/klaviyo/push/:memberId - Push member to Klaviyo
router.post('/push/:memberId', asyncHandler(async (req, res) => {
  const memberId = parseInt(req.params.memberId);
  
  // Get member from database
  const member = await getMemberById(memberId);
  if (!member) {
    return res.status(404).json({ error: 'Member not found' });
  }
  
  await klaviyoService.pushMemberToKlaviyo(member);
  
  res.json({
    success: true,
    message: 'Member pushed to Klaviyo successfully'
  });
}));

// Helper function to get member (should be moved to MemberService)
async function getMemberById(id: number): Promise<Member | null> {
  // This is a temporary implementation - should use MemberService
  const db = DatabaseService.getInstance();
  const stmt = db.prepare('SELECT * FROM members WHERE id = ?');
  const result = stmt.get(id) as Member | undefined;
  return result || null;
}

export { router as klaviyoRoutes };