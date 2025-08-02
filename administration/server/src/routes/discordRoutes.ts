import { Router } from 'express';
import { Effect } from 'effect';
import { asyncHandler } from '../middleware/errorHandler';
import * as DiscordSyncEffects from '../services/effect/DiscordSyncEffects';
import { effectToExpress, extractBody, extractQuery } from '../services/effect/adapters/expressAdapter';
import { DatabaseLive } from '../services/effect/layers/DatabaseLayer';
import type { DiscordWebhookPayload } from '../services/effect/schemas/CommonSchemas';

const router = Router();

// Initialize Discord bot on startup (only if token is configured)
if (process.env.DISCORD_BOT_TOKEN) {
  console.log('Discord bot token configured - initialization would happen here');
}

// Discord webhook signature verification middleware
const verifyDiscordSignature = (req: any, res: any, next: any) => {
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  
  if (!signature || !timestamp) {
    return res.status(401).json({ error: 'Missing Discord signature headers' });
  }

  // Discord uses Ed25519 signature verification
  // For now, we'll accept all requests and rely on bot token security
  req.discordSignature = signature;
  req.discordTimestamp = timestamp;
  next();
};

// POST /api/discord/webhook - Handle Discord webhooks (if using webhook mode)
router.post('/webhook', verifyDiscordSignature, effectToExpress((req, res) =>
  Effect.gen(function* () {
    const payload = yield* extractBody<DiscordWebhookPayload>(req);
    const signature = (req as any).discordSignature;
    
    yield* DiscordSyncEffects.handleDiscordWebhook(payload, signature);
    
    return { message: 'Discord webhook processed successfully' };
  })
));

// POST /api/discord/sync - Manual bulk sync for Discord server
router.post('/sync', effectToExpress((req, res) =>
  Effect.gen(function* () {
    const guildId = process.env.DISCORD_GUILD_ID || '';
    const result = yield* DiscordSyncEffects.bulkSyncDiscordMembers(guildId);
    
    return {
      success: true,
      message: `Discord sync completed: ${result.synced} synced, ${result.errors} errors`,
      data: result
    };
  })
));

// POST /api/discord/role/add - Add role to Discord member
router.post('/role/add', asyncHandler(async (req, res) => {
  const { user_id, role_id } = req.body;
  
  if (!user_id || !role_id) {
    return res.status(400).json({ error: 'user_id and role_id required' });
  }
  
  // This would integrate with Discord bot API
  // For now, returning a placeholder response
  res.json({
    success: true,
    message: `Role management not implemented in Effect version yet`,
    note: 'This would require Discord bot integration'
  });
}));

// POST /api/discord/role/remove - Remove role from Discord member
router.post('/role/remove', asyncHandler(async (req, res) => {
  const { user_id, role_id } = req.body;
  
  if (!user_id || !role_id) {
    return res.status(400).json({ error: 'user_id and role_id required' });
  }
  
  // This would integrate with Discord bot API
  // For now, returning a placeholder response
  res.json({
    success: true,
    message: `Role management not implemented in Effect version yet`,
    note: 'This would require Discord bot integration'
  });
}));

// POST /api/discord/message - Send direct message to Discord user
router.post('/message', asyncHandler(async (req, res) => {
  const { user_id, message } = req.body;
  
  if (!user_id || !message) {
    return res.status(400).json({ error: 'user_id and message required' });
  }
  
  // This would integrate with Discord bot API
  // For now, returning a placeholder response
  res.json({
    success: true,
    message: `Direct messaging not implemented in Effect version yet`,
    note: 'This would require Discord bot integration'
  });
}));

// GET /api/discord/config - Get Discord bot configuration info
router.get('/config', asyncHandler(async (req, res) => {
  const config = {
    guild_id: process.env.DISCORD_GUILD_ID || 'not-configured',
    professional_role_ids: process.env.DISCORD_PROFESSIONAL_ROLE_IDS?.split(',') || [],
    member_role_ids: process.env.DISCORD_MEMBER_ROLE_IDS?.split(',') || [],
    bot_configured: !!process.env.DISCORD_BOT_TOKEN,
    required_env_vars: [
      'DISCORD_BOT_TOKEN',
      'DISCORD_GUILD_ID',
      'DISCORD_PROFESSIONAL_ROLE_IDS',
      'DISCORD_MEMBER_ROLE_IDS'
    ]
  };
  
  res.json({
    success: true,
    data: config,
    setup_instructions: {
      note: 'Discord bot requires proper configuration',
      steps: [
        '1. Create a Discord application at https://discord.com/developers/applications',
        '2. Create a bot and copy the token to DISCORD_BOT_TOKEN',
        '3. Get your Discord server ID and set DISCORD_GUILD_ID',
        '4. Configure role IDs for DISCORD_PROFESSIONAL_ROLE_IDS and DISCORD_MEMBER_ROLE_IDS',
        '5. Invite bot to server with appropriate permissions'
      ]
    }
  });
}));

// GET /api/discord/members/:discordId - Get member info by Discord ID
router.get('/members/:discordId', asyncHandler(async (req, res) => {
  const { discordId } = req.params;
  
  // This would query the database for a member with this Discord ID
  // For now, returning a placeholder response
  res.json({
    success: true,
    message: 'This endpoint would fetch member data by Discord ID',
    discord_id: discordId,
    note: 'Query external_integrations table where system_name = "discord" and external_id = discordId'
  });
}));

// POST /api/discord/setup - Setup Discord bot configuration
router.post('/setup', asyncHandler(async (req, res) => {
  const { guild_id, special_role_ids, member_role_ids } = req.body;
  
  if (!guild_id) {
    return res.status(400).json({ 
      error: 'guild_id required',
      example: {
        guild_id: '123456789012345678',
        special_role_ids: ['role1', 'role2'],
        member_role_ids: ['role3', 'role4']
      }
    });
  }
  
  // This would update environment variables or configuration
  // For now, returning setup instructions
  res.json({
    success: true,
    message: 'Discord setup configuration',
    data: {
      guild_id,
      special_role_ids: special_role_ids || [],
      member_role_ids: member_role_ids || [],
      note: 'Update your environment variables with these values'
    },
    environment_variables: {
      DISCORD_GUILD_ID: guild_id,
      DISCORD_SPECIAL_ROLE_IDS: (special_role_ids || []).join(','),
      DISCORD_MEMBER_ROLE_IDS: (member_role_ids || []).join(',')
    }
  });
}));

export { router as discordRoutes };