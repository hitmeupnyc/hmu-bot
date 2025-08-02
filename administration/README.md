# Getting Started

> Get productive in 2 minutes

## Quick Setup

```bash
git clone <repo>
cd administration
npm run setup && npm run dev
```

**Done!** App running at:
- 🌐 http://localhost:5173 (frontend)
- 🔌 http://localhost:3000 (API)

## Daily Commands

```bash
npm run dev           # Start everything
npm test              # Run tests
npm run lint          # Check code quality
npm run reset         # Nuclear option if broken
```

## External Services (Optional)

### Discord Bot (Recommended)
1. Create bot: https://discord.com/developers/applications
2. Add to `.env`: `DISCORD_BOT_TOKEN=your_token`
3. Test: `curl -X POST localhost:3000/api/discord/sync`

### Other Services
Copy `server/.env.example` to `server/.env` and add:
- `KLAVIYO_API_KEY` - Email marketing
- `EVENTBRITE_API_TOKEN` - Event management  
- `PATREON_CLIENT_ID/SECRET` - Membership tiers

## Troubleshooting

**Database issues**: `npm run dev:db-reset`
**Port conflicts**: `npm run ports:clear`
**Everything broken**: `npm run reset`

## File Structure

```
administration/
├── server/          # Node.js API
├── client/          # React frontend  
├── tests/           # E2E tests
└── notes/           # Technical decisions
```

## Before Committing

```bash
npm run lint && npm run typecheck && npm test
```

---

**Need more details?** Check CLAUDE.md for advanced commands or ask in Slack.