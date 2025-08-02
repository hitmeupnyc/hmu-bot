import { Router } from 'express';
import { Effect } from 'effect';
import { asyncHandler } from '../middleware/errorHandler';
import * as PatreonSyncEffects from '../services/effect/PatreonSyncEffects';
import { effectToExpress, extractBody, extractQuery } from '../services/effect/adapters/expressAdapter';
import type { PatreonWebhookPayload } from '../services/effect/schemas/PatreonSchemas';

const router = Router();

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
router.post('/webhook', verifyPatreonSignature, effectToExpress((req, res) =>
  Effect.gen(function* () {
    const payload = yield* extractBody<PatreonWebhookPayload>(req);
    const signature = (req as any).patreonSignature;
    
    yield* PatreonSyncEffects.handlePatreonWebhook(payload, signature);
    
    return { message: 'Webhook processed successfully' };
  })
));

// POST /api/patreon/sync/:campaignId - Manual bulk sync for campaign
router.post('/sync/:campaignId', effectToExpress((req, res) =>
  Effect.gen(function* () {
    const campaignId = req.params.campaignId;
    
    const result = yield* PatreonSyncEffects.bulkSyncPatreons(campaignId);
    
    return {
      success: true,
      message: `Patreon sync completed: ${result.synced} synced, ${result.errors} errors`,
      data: result
    };
  })
));

// GET /api/patreon/oauth/url - Get OAuth authorization URL
router.get('/oauth/url', effectToExpress((req, res) =>
  Effect.gen(function* () {
    const query = yield* extractQuery(req);
    const { redirect_uri, state } = query as any;
    
    if (!redirect_uri) {
      res.status(400);
      return { error: 'redirect_uri parameter required' };
    }
    
    const authUrl = yield* PatreonSyncEffects.getPatreonOAuthURL(redirect_uri as string, state as string);
    
    return {
      success: true,
      data: {
        authorization_url: authUrl,
        state
      }
    };
  })
));

// POST /api/patreon/oauth/token - Exchange authorization code for tokens
router.post('/oauth/token', effectToExpress((req, res) =>
  Effect.gen(function* () {
    const bodyData = yield* extractBody<{code: string, redirect_uri: string}>(req);
    const { code, redirect_uri } = bodyData;
    
    if (!code || !redirect_uri) {
      res.status(400);
      return { error: 'code and redirect_uri required' };
    }
    
    const tokens = yield* PatreonSyncEffects.exchangePatreonOAuthCode(code, redirect_uri) as any;
    
    // In a real implementation, you would store these tokens securely
    // and associate them with your application's user/admin
    return {
      success: true,
      message: 'Tokens received successfully',
      data: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        scope: tokens.scope,
        token_type: tokens.token_type
      }
    };
  }).pipe(
    Effect.mapError((error) => {
      res.status(400);
      return {
        error: 'Failed to exchange code for tokens',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    })
  )
));

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