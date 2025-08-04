# Club Management System - External Service Setup Guide

This guide walks you through setting up all external service integrations for the club management system.

## 🚀 Quick Start

1. **Copy environment file:**
   ```bash
   cd server
   cp .env.example .env
   ```

2. **Edit `.env` file with your credentials** (see detailed sections below)

3. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

---

## 📋 Action Items Checklist

### ✅ Environment Setup
- [ ] Copy `.env.example` to `.env`
- [ ] Generate JWT secret (see Security section)
- [ ] Set up webhook base URL (see Webhook Setup section)

### ✅ Klaviyo Integration
- [ ] Create Klaviyo account
- [ ] Obtain API key
- [ ] Configure webhook secret
- [ ] Test profile sync

### ✅ Eventbrite Integration  
- [ ] Create Eventbrite account
- [ ] Register application for API access
- [ ] Obtain API token
- [ ] Configure webhook
- [ ] Test event/attendee sync

### ✅ Patreon Integration
- [ ] Create Patreon Creator account
- [ ] Register OAuth application
- [ ] Configure webhook
- [ ] Complete OAuth flow
- [ ] Test pledge/patron sync

### ✅ Discord Integration
- [ ] Create Discord application
- [ ] Create bot and obtain token
- [ ] Add bot to server with proper permissions
- [ ] Configure role mappings
- [ ] Test member sync

### ✅ Production Deployment
- [ ] Set up production webhook URLs
- [ ] Configure SSL certificates
- [ ] Set up monitoring
- [ ] Test all integrations

---

## 🔐 Security Configuration

### Generate JWT Secret
```bash
# Generate a secure random string for JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Add this to your `.env` file:
```bash
JWT_SECRET=your_generated_secret_here
```

---

## 🌐 Webhook Setup

### Local Development with ngrok
1. **Install ngrok:** https://ngrok.com/
2. **Start your server:** `npm run dev`
3. **In another terminal:** `ngrok http 3000`
4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)
5. **Add to `.env`:**
   ```bash
   WEBHOOK_BASE_URL=https://abc123.ngrok.io
   ```

### Production Setup
Set your actual domain:
```bash
WEBHOOK_BASE_URL=https://your-domain.com
```

---

## 📧 Klaviyo Integration

### Step 1: Create Account & Get API Key
1. **Sign up:** https://www.klaviyo.com/
2. **Navigate to:** Account → Settings → API Keys
3. **Create Private API Key**
4. **Copy the key** (starts with `pk_`)

### Step 2: Configure Environment
```bash
KLAVIYO_API_KEY=pk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
KLAVIYO_WEBHOOK_SECRET=your_webhook_secret_here
```

### Step 3: Set Up Webhook (Optional)
1. **Go to:** Account → Settings → Webhooks
2. **Create webhook** with URL: `{WEBHOOK_BASE_URL}/api/klaviyo/webhook`
3. **Select events:** Profile Created, Profile Updated
4. **Copy webhook secret** to `KLAVIYO_WEBHOOK_SECRET`

### Step 4: Test Integration
```bash
# Test profile sync
curl -X POST http://localhost:3000/api/klaviyo/sync \
  -H "Content-Type: application/json"
```

### Available Endpoints
- `POST /api/klaviyo/webhook` - Webhook receiver
- `POST /api/klaviyo/sync` - Manual bulk sync
- `POST /api/klaviyo/push/:memberId` - Push member to Klaviyo

---

## 🎟️ Eventbrite Integration

### Step 1: Create Account & Get Credentials
1. **Sign up:** https://www.eventbrite.com/
2. **Navigate to:** Account → Developer Links → API Keys
3. **Create new API key**
4. **Copy your OAuth Token**

### Step 2: Configure Environment
```bash
EVENTBRITE_API_TOKEN=XXXXXXXXXXXXXXXXXXXXXXXX
EVENTBRITE_WEBHOOK_SECRET=your_webhook_secret_here
EVENTBRITE_WEBHOOK_TOKEN=your_webhook_token_here
```

### Step 3: Set Up Webhook
1. **Use API or Eventbrite dashboard**
2. **Webhook URL:** `{WEBHOOK_BASE_URL}/api/eventbrite/webhook`
3. **Events to subscribe:**
   - `order.placed`
   - `order.updated`
   - `attendee.updated`
   - `event.published`
   - `event.updated`

### Step 4: Test Integration
```bash
# Test event sync
curl -X POST http://localhost:3000/api/eventbrite/events/sync

# Test attendee sync for specific event
curl -X POST http://localhost:3000/api/eventbrite/events/123456789/attendees/sync
```

### Available Endpoints
- `POST /api/eventbrite/webhook` - Webhook receiver
- `POST /api/eventbrite/events/sync` - Sync all events
- `POST /api/eventbrite/events/:eventId/attendees/sync` - Sync event attendees

---

## 💰 Patreon Integration

### Step 1: Create Creator Account & Register App
1. **Sign up:** https://www.patreon.com/
2. **Navigate to:** https://www.patreon.com/portal/registration/register-clients
3. **Create new client**
4. **App Details:**
   - **Name:** Your Club Management System
   - **Description:** Member management and sync
   - **Category:** Other
   - **Redirect URI:** `{WEBHOOK_BASE_URL}/api/patreon/oauth/callback`

### Step 2: Configure Environment
```bash
PATREON_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
PATREON_CLIENT_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
PATREON_WEBHOOK_SECRET=your_webhook_secret_here
```

### Step 3: Complete OAuth Flow
1. **Get authorization URL:**
   ```bash
   curl "http://localhost:3000/api/patreon/oauth/url?redirect_uri=http://localhost:3000/callback"
   ```
2. **Visit the URL** and authorize
3. **Exchange code for tokens:**
   ```bash
   curl -X POST http://localhost:3000/api/patreon/oauth/token \
     -H "Content-Type: application/json" \
     -d '{"code":"AUTH_CODE","redirect_uri":"http://localhost:3000/callback"}'
   ```
4. **Add tokens to `.env`:**
   ```bash
   PATREON_ACCESS_TOKEN=returned_access_token
   PATREON_REFRESH_TOKEN=returned_refresh_token
   ```

### Step 4: Set Up Webhook
```bash
curl -X POST http://localhost:3000/api/patreon/webhook/setup \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "YOUR_CAMPAIGN_ID",
    "triggers": ["members:create", "members:update", "members:delete"],
    "uri": "https://your-domain.com/api/patreon/webhook"
  }'
```

### Available Endpoints
- `POST /api/patreon/webhook` - Webhook receiver
- `POST /api/patreon/sync/:campaignId` - Manual sync
- `GET /api/patreon/oauth/url` - Get OAuth URL
- `POST /api/patreon/oauth/token` - Exchange code for tokens

---

## 🤖 Discord Integration

### Step 1: Create Discord Application & Bot
1. **Navigate to:** https://discord.com/developers/applications
2. **Click "New Application"**
3. **Go to "Bot" section**
4. **Click "Add Bot"**
5. **Copy the Bot Token**
6. **Enable these Privileged Gateway Intents:**
   - Server Members Intent
   - Message Content Intent

### Step 2: Add Bot to Your Server
1. **Go to OAuth2 → URL Generator**
2. **Select scopes:** `bot`
3. **Select permissions:**
   - View Channels
   - Send Messages
   - Manage Roles
   - Read Message History
   - View Guild Insights
4. **Copy URL and visit it** to add bot to your server

### Step 3: Get Server & Role IDs
1. **Enable Developer Mode** in Discord (User Settings → Advanced → Developer Mode)
2. **Right-click your server** → Copy ID (this is GUILD_ID)
3. **Right-click roles** → Copy ID (for role mappings)

### Step 4: Configure Environment
```bash
DISCORD_BOT_TOKEN=OTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.XXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXX
DISCORD_GUILD_ID=123456789012345678
DISCORD_PROFESSIONAL_ROLE_IDS=123456789012345678,987654321098765432
DISCORD_MEMBER_ROLE_IDS=555666777888999000,111222333444555666
```

### Step 5: Test Integration
```bash
# Test bot configuration
curl http://localhost:3000/api/discord/config

# Test member sync
curl -X POST http://localhost:3000/api/discord/sync

# Test role management
curl -X POST http://localhost:3000/api/discord/role/add \
  -H "Content-Type: application/json" \
  -d '{"user_id":"123456789012345678","role_id":"987654321098765432"}'
```

### Available Endpoints
- `POST /api/discord/sync` - Manual member sync
- `POST /api/discord/role/add` - Add role to member
- `POST /api/discord/role/remove` - Remove role from member
- `POST /api/discord/message` - Send DM to member
- `GET /api/discord/config` - View bot configuration

---

## 🔧 Environment Variable Reference

### Required Variables
```bash
# Core application
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:5173
DATABASE_PATH=./data/club.db
JWT_SECRET=your_long_random_secret_here

# Webhook base URL
WEBHOOK_BASE_URL=https://your-domain.com

# At least one service should be configured:
KLAVIYO_API_KEY=pk_live_XXXXXX
EVENTBRITE_API_TOKEN=XXXXXX
PATREON_CLIENT_ID=XXXXXX
DISCORD_BOT_TOKEN=XXXXXX
```

### Optional Variables
```bash
# Webhook secrets (recommended for production)
KLAVIYO_WEBHOOK_SECRET=secret
EVENTBRITE_WEBHOOK_SECRET=secret
PATREON_WEBHOOK_SECRET=secret

# Service-specific configuration
EVENTBRITE_ORGANIZATION_ID=123456789
DISCORD_PROFESSIONAL_ROLE_IDS=role1,role2
DISCORD_MEMBER_ROLE_IDS=role3,role4

# Development settings
DEBUG_API_RESPONSES=false
DISABLE_WEBHOOK_VERIFICATION=false
LOG_LEVEL=info
```

---

## 🚨 Troubleshooting

### Common Issues

#### ❌ "API key not configured" errors
**Solution:** Check that your `.env` file exists and has the correct variable names

#### ❌ Webhook signature verification fails
**Solutions:**
1. Check that webhook secrets match between service and `.env`
2. For development, temporarily set `DISABLE_WEBHOOK_VERIFICATION=true`
3. Ensure webhook payload is sent as raw body (not JSON parsed)

#### ❌ Discord bot can't see members
**Solutions:**
1. Ensure "Server Members Intent" is enabled in Discord Developer Portal
2. Bot needs "View Guild Insights" permission
3. Verify DISCORD_GUILD_ID is correct

#### ❌ Patreon OAuth errors
**Solutions:**
1. Check redirect URI matches exactly in Patreon app settings
2. Ensure client ID and secret are correct
3. Verify OAuth scope includes required permissions

#### ❌ Eventbrite rate limiting
**Solutions:**
1. Implement exponential backoff (already included in sync services)
2. Reduce `SYNC_WORKER_CONCURRENCY` in `.env`
3. Add delays between bulk operations

### Getting Help

1. **Check application logs** for detailed error messages
2. **Verify API endpoints** using the test commands in each section
3. **Check external service dashboards** for webhook delivery status
4. **Review environment variables** using the health check endpoints

### Health Check Endpoints
- `GET /health` - Application health
- `GET /api/klaviyo/config` - Klaviyo configuration status
- `GET /api/discord/config` - Discord bot status
- `GET /api/patreon/campaigns` - Patreon connection status

---

## 📝 Next Steps

After completing setup:

1. **Test each integration individually** using the provided curl commands
2. **Set up monitoring** for webhook delivery failures
3. **Configure backup procedures** for your database
4. **Review security settings** before production deployment
5. **Set up automated syncing schedules** if needed

## 🔒 Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong, unique webhook secrets** for each service
3. **Enable webhook signature verification** in production
4. **Regularly rotate API keys and tokens**
5. **Monitor for unusual API usage patterns**
6. **Use HTTPS** for all webhook endpoints in production
7. **Implement rate limiting** on your webhook endpoints

---

**Questions or issues?** Check the troubleshooting section above or review the service-specific documentation linked in each section.