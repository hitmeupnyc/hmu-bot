# 🚀 Developer Quick Start

> Get up and running in under 2 minutes

## First Time Setup

```bash
git clone <repo>
cd administration
npm run setup     # Installs deps, creates .env, sets up database
npm run dev       # Starts both client and server
```

**That's it!** Your app is running at:
- 🌐 **Frontend**: http://localhost:5173
- 🔌 **API**: http://localhost:3000
- 💊 **Health Check**: http://localhost:3000/health

## Daily Development

```bash
npm run dev           # Start everything (recommended)
npm run dev:server    # Server only
npm run dev:client    # Client only
```

## Common Tasks

```bash
# Reset database with fresh data
npm run dev:db-reset

# Run all tests
npm test

# Check code quality
npm run lint && npm run typecheck

# Clean slate (if things get weird)
npm run reset
```

## Troubleshooting

### ❌ Database errors
```bash
npm run dev:db-reset
```

### ❌ Port conflicts
Kill processes using ports 3000 or 5173:
```bash
lsof -ti:3000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### ❌ Environment issues
```bash
npm run setup:env    # Recreate .env
```

### ❌ "It worked yesterday"
```bash
npm run reset        # Nuclear option
```

## File Structure

```
administration/
├── server/          # Node.js API
├── client/          # React frontend  
├── tests/           # E2E tests
├── scripts/         # Dev utilities
└── .vscode/         # Editor config
```

## Before Committing

```bash
npm run lint && npm run typecheck && npm test
```

---

📖 **Need more details?** See [README.md](README.md) and [SETUP_GUIDE.md](SETUP_GUIDE.md)