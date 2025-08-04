# 🚀 External Service Integration - Action Items

## 📋 Immediate Setup Tasks

### 1. Environment Configuration
```bash
# Copy environment template
cd administration/server
cp .env.example .env

# Generate secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Add result to JWT_SECRET in .env
```

### 2. Webhook Development Setup
```bash
# Install ngrok for local development
brew install ngrok  # macOS
# or download from https://ngrok.com/

# Start your development server
npm run dev

# In another terminal, expose local server
ngrok http 3000
# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Add to .env as WEBHOOK_BASE_URL=https://abc123.ngrok.io
```

## 🔧 Service-Specific Setup

### ✅ Klaviyo (Email Marketing)
**Priority: Medium** | **Estimated Time: 15 minutes**

1. **Get API Key:**
   - Sign up at https://www.klaviyo.com/
   - Go to Account → Settings → API Keys
   - Create Private API Key (starts with `pk_`)
   
2. **Add to .env:**
   ```bash
   KLAVIYO_API_KEY=pk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   KLAVIYO_WEBHOOK_SECRET=your_generated_secret_here
   ```

3. **Test:** `curl -X POST http://localhost:3000/api/klaviyo/sync`

### ✅ Eventbrite (Event Management)
**Priority: High** | **Estimated Time: 20 minutes**

1. **Get API Token:**
   - Sign up at https://www.eventbrite.com/
   - Go to Account → Developer Links → API Keys
   - Copy your OAuth Token
   
2. **Add to .env:**
   ```bash
   EVENTBRITE_API_TOKEN=XXXXXXXXXXXXXXXXXXXXXXXX
   EVENTBRITE_WEBHOOK_SECRET=your_generated_secret_here
   ```

3. **Set up webhook** (after deployment):
   - URL: `{WEBHOOK_BASE_URL}/api/eventbrite/webhook`
   - Events: `order.placed`, `order.updated`, `attendee.updated`, `event.published`

4. **Test:** `curl -X POST http://localhost:3000/api/eventbrite/events/sync`

### ✅ Patreon (Membership Tiers)
**Priority: High** | **Estimated Time: 30 minutes**

1. **Register OAuth App:**
   - Go to https://www.patreon.com/portal/registration/register-clients
   - Create new client with redirect URI: `{WEBHOOK_BASE_URL}/api/patreon/oauth/callback`
   
2. **Add to .env:**
   ```bash
   PATREON_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   PATREON_CLIENT_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   PATREON_WEBHOOK_SECRET=your_generated_secret_here
   ```

3. **Complete OAuth flow:**
   ```bash
   # Get auth URL
   curl "http://localhost:3000/api/patreon/oauth/url?redirect_uri=http://localhost:3000/callback"
   # Visit URL, authorize, then exchange code for tokens
   ```

4. **Test:** `curl -X POST http://localhost:3000/api/patreon/sync/YOUR_CAMPAIGN_ID`

### ✅ Discord (Community Management)  
**Priority: High** | **Estimated Time: 25 minutes**

1. **Create Discord Bot:**
   - Go to https://discord.com/developers/applications
   - Create new application → Bot section → Add Bot
   - Copy Bot Token
   - Enable "Server Members Intent" and "Message Content Intent"

2. **Add Bot to Server:**
   - OAuth2 → URL Generator → Select `bot` scope
   - Permissions: View Channels, Send Messages, Manage Roles, Read Message History
   - Visit generated URL to add bot

3. **Get IDs (Enable Developer Mode in Discord first):**
   - Right-click server → Copy ID (GUILD_ID)
   - Right-click roles → Copy ID (for role mappings)

4. **Add to .env:**
   ```bash
   DISCORD_BOT_TOKEN=OTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.XXXXXX.XXXXXXXXXXXX
   DISCORD_GUILD_ID=123456789012345678
   DISCORD_PROFESSIONAL_ROLE_IDS=123456789012345678,987654321098765432
   DISCORD_MEMBER_ROLE_IDS=555666777888999000,111222333444555666
   ```

5. **Test:** `curl -X POST http://localhost:3000/api/discord/sync`

## 🔒 Security & Production

### 1. Generate Webhook Secrets
```bash
# Generate unique secrets for each service
for service in klaviyo eventbrite patreon; do
  echo "${service^^}_WEBHOOK_SECRET=$(openssl rand -hex 32)"
done
```

### 2. Production Webhook URLs
Update all external service webhook configurations to use your production domain:
- Klaviyo: `https://your-domain.com/api/klaviyo/webhook`
- Eventbrite: `https://your-domain.com/api/eventbrite/webhook`  
- Patreon: `https://your-domain.com/api/patreon/webhook`

### 3. Environment Security
- [ ] Never commit `.env` files to git
- [ ] Use strong, unique secrets for each service
- [ ] Enable webhook signature verification in production
- [ ] Set up SSL certificates for webhook endpoints

## 🧪 Testing & Validation

### Health Check Commands
```bash
# Test application health
curl http://localhost:3000/health

# Check Discord bot configuration
curl http://localhost:3000/api/discord/config

# Test each service sync manually
curl -X POST http://localhost:3000/api/klaviyo/sync
curl -X POST http://localhost:3000/api/eventbrite/events/sync
curl -X POST http://localhost:3000/api/patreon/sync/CAMPAIGN_ID
curl -X POST http://localhost:3000/api/discord/sync
```

### Database Verification
```bash
# Check sync operations table for activity
sqlite3 administration/data/club.db "SELECT platform, operation_type, status, COUNT(*) FROM sync_operations GROUP BY platform, operation_type, status;"

# Check external integrations
sqlite3 administration/data/club.db "SELECT system_name, COUNT(*) FROM external_integrations WHERE flags & 1 = 1 GROUP BY system_name;"
```

## 📊 Monitoring Setup

### 1. Webhook Delivery Monitoring
Each service provides webhook delivery logs in their respective dashboards:
- **Klaviyo:** Account → Settings → Webhooks → View logs
- **Eventbrite:** Developer dashboard → Webhooks
- **Patreon:** Creator dashboard → Webhooks

### 2. Application Monitoring
- Monitor the `/health` endpoint
- Set up alerts for failed sync operations
- Track `sync_operations` table for error patterns

### 3. Rate Limiting Awareness
- **Klaviyo:** 150 requests/minute per account
- **Eventbrite:** 1000 requests/hour per token  
- **Patreon:** 1000 requests/hour per client
- **Discord:** 50 requests/second with burst allowance

## 🆘 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "API key not configured" | Check `.env` file exists and variable names match |
| Webhook signature failures | Verify secrets match, check raw body handling |
| Discord bot can't see members | Enable "Server Members Intent" in bot settings |
| Patreon OAuth errors | Verify redirect URI matches app settings exactly |
| Rate limiting errors | Reduce `SYNC_WORKER_CONCURRENCY` in `.env` |

## 📚 Documentation References

- **Full Setup Guide:** `administration/SETUP_GUIDE.md`
- **API Documentation:** Each service's developer docs
- **Environment Variables:** `administration/server/.env.example`
- **Database Schema:** `administration/schema.sql`

---

**Next Steps:** Start with Discord and Eventbrite as they provide the most immediate value for member and event management. Add Patreon for membership tiers, then Klaviyo for email marketing.