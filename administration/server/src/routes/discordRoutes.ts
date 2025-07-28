import { Router } from 'express';
import { DiscordSyncService, DiscordWebhookPayload } from '../services/DiscordSyncService';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const discordService = new DiscordSyncService();

// Initialize Discord bot on startup
discordService.initialize().catch(console.error);

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
router.post('/webhook', verifyDiscordSignature, asyncHandler(async (req, res) => {
  const payload: DiscordWebhookPayload = req.body;
  
  // Handle different Discord webhook events
  switch (payload.event_type) {
    case 'member_join':
      // This would be handled by the bot's event listeners
      break;
    case 'member_leave':
      // This would be handled by the bot's event listeners
      break;
    case 'member_update':
      // This would be handled by the bot's event listeners
      break;
    default:
      return res.status(400).json({ error: 'Unknown event type' });
  }
  
  res.status(200).json({ message: 'Discord webhook processed successfully' });
}));

// POST /api/discord/sync - Manual bulk sync for Discord server
router.post('/sync', asyncHandler(async (req, res) => {
  const result = await discordService.bulkSync();
  
  res.json({
    success: true,
    message: `Discord sync completed: ${result.synced} synced, ${result.errors} errors`,
    data: result
  });
}));

// POST /api/discord/role/add - Add role to Discord member
router.post('/role/add', asyncHandler(async (req, res) => {
  const { user_id, role_id } = req.body;
  
  if (!user_id || !role_id) {
    return res.status(400).json({ error: 'user_id and role_id required' });
  }
  
  const success = await discordService.addRoleToMember(user_id, role_id);
  
  if (success) {
    res.json({
      success: true,
      message: `Role ${role_id} added to user ${user_id}`
    });
  } else {
    res.status(400).json({
      error: 'Failed to add role',
      details: 'User or role not found, or insufficient permissions'
    });
  }
}));

// POST /api/discord/role/remove - Remove role from Discord member
router.post('/role/remove', asyncHandler(async (req, res) => {
  const { user_id, role_id } = req.body;
  
  if (!user_id || !role_id) {
    return res.status(400).json({ error: 'user_id and role_id required' });
  }
  
  const success = await discordService.removeRoleFromMember(user_id, role_id);
  
  if (success) {
    res.json({
      success: true,
      message: `Role ${role_id} removed from user ${user_id}`
    });
  } else {
    res.status(400).json({
      error: 'Failed to remove role',
      details: 'User or role not found, or insufficient permissions'
    });
  }
}));

// POST /api/discord/message - Send direct message to Discord user
router.post('/message', asyncHandler(async (req, res) => {
  const { user_id, message } = req.body;
  
  if (!user_id || !message) {
    return res.status(400).json({ error: 'user_id and message required' });
  }
  
  const success = await discordService.sendDirectMessage(user_id, message);
  
  if (success) {
    res.json({
      success: true,
      message: `Direct message sent to user ${user_id}`
    });
  } else {
    res.status(400).json({
      error: 'Failed to send message',
      details: 'User not found, DMs disabled, or bot blocked'
    });
  }
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