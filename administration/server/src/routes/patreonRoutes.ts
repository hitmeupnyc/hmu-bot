import { Router } from 'express';
import { PatreonSyncService, PatreonWebhookPayload } from '../services/PatreonSyncService';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const patreonService = new PatreonSyncService();

// Webhook signature verification middleware
const verifyPatreonSignature = (req: any, res: any, next: any) => {
  const signature = req.headers['x-patreon-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!signature) {
    return res.status(401).json({ error: 'Missing signature header' });
  }

  // Signature verification is handled in the service
  req.patreonSignature = signature;
  next();
};

// POST /api/patreon/webhook - Handle Patreon webhooks
router.post('/webhook', verifyPatreonSignature, asyncHandler(async (req, res) => {
  const payload: PatreonWebhookPayload = req.body;
  const signature = req.patreonSignature;
  
  await patreonService.handleWebhook(payload, signature);
  
  res.status(200).json({ message: 'Webhook processed successfully' });
}));

// POST /api/patreon/sync/:campaignId - Manual bulk sync for campaign
router.post('/sync/:campaignId', asyncHandler(async (req, res) => {
  const { campaignId } = req.params;
  
  const result = await patreonService.bulkSync(campaignId);
  
  res.json({
    success: true,
    message: `Patreon sync completed: ${result.synced} synced, ${result.errors} errors`,
    data: result
  });
}));

// GET /api/patreon/oauth/url - Get OAuth authorization URL
router.get('/oauth/url', asyncHandler(async (req, res) => {
  const { redirect_uri, state } = req.query;
  
  if (!redirect_uri) {
    return res.status(400).json({ error: 'redirect_uri parameter required' });
  }
  
  const authUrl = patreonService.getOAuthURL(redirect_uri as string, state as string);
  
  res.json({
    success: true,
    data: {
      authorization_url: authUrl,
      state
    }
  });
}));

// POST /api/patreon/oauth/token - Exchange authorization code for tokens
router.post('/oauth/token', asyncHandler(async (req, res) => {
  const { code, redirect_uri } = req.body;
  
  if (!code || !redirect_uri) {
    return res.status(400).json({ error: 'code and redirect_uri required' });
  }
  
  try {
    const tokens = await patreonService.getTokens(code, redirect_uri);
    
    // In a real implementation, you would store these tokens securely
    // and associate them with your application's user/admin
    res.json({
      success: true,
      message: 'Tokens received successfully',
      data: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        scope: tokens.scope,
        token_type: tokens.token_type
      }
    });
  } catch (error) {
    res.status(400).json({ 
      error: 'Failed to exchange code for tokens',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// GET /api/patreon/campaigns - Get user's campaigns (requires valid access token)
router.get('/campaigns', asyncHandler(async (req, res) => {
  // This endpoint would require a valid Patreon access token
  // For now, returning a placeholder response
  res.json({
    success: true,
    message: 'This endpoint would fetch campaigns from Patreon API',
    note: 'Requires valid access token implementation'
  });
}));

// GET /api/patreon/campaign/:campaignId/pledges - Get pledges for campaign
router.get('/campaign/:campaignId/pledges', asyncHandler(async (req, res) => {
  const { campaignId } = req.params;
  const { page = 1, count = 20 } = req.query;
  
  // This endpoint would make a direct API call to Patreon
  // For now, returning a placeholder response
  res.json({
    success: true,
    message: 'This endpoint would fetch pledges from Patreon API',
    campaignId,
    pagination: { page, count }
  });
}));

// POST /api/patreon/webhook/setup - Setup webhook endpoints (admin only)
router.post('/webhook/setup', asyncHandler(async (req, res) => {
  const { campaign_id, triggers, uri } = req.body;
  
  if (!campaign_id || !triggers || !uri) {
    return res.status(400).json({ 
      error: 'campaign_id, triggers, and uri required',
      example: {
        campaign_id: '12345',
        triggers: ['members:create', 'members:update', 'members:delete'],
        uri: 'https://your-domain.com/api/patreon/webhook'
      }
    });
  }
  
  // This would create the webhook using the Patreon API
  // For now, returning setup instructions
  res.json({
    success: true,
    message: 'Webhook setup instructions',
    data: {
      webhook_url: uri,
      secret: process.env.PATREON_WEBHOOK_SECRET || 'configure-webhook-secret',
      triggers,
      campaign_id,
      note: 'Use Patreon Creator Dashboard or API to configure the actual webhook'
    }
  });
}));

export { router as patreonRoutes };