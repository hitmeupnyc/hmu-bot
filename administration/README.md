# Club Management System

A modern web application for managing club members and events with external integrations support.

## 🚀 Quick Start

> 👨‍💻 **New Developer?** See [DEV_QUICK_START.md](DEV_QUICK_START.md) for fastest setup

### One Command Setup

```bash
npm run setup && npm run dev
```

That's it! The application will be running at:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## 📋 Available Commands

### Development (Powered by Turborepo)

```bash
# Start everything (recommended for active development)
npm run dev                # Starts server + client in parallel

# Manual control (if you prefer)
npm run dev:server         # Backend only (port 3000)
npm run dev:client         # Frontend only (port 5173)
```

### Setup & Installation

```bash
npm run setup              # Install all dependencies via workspaces
```

### Testing

```bash
npm test                   # Run e2e tests once
npm run test:e2e           # Same as above
npm run test:server        # Run server tests
npm run test:client        # Run client tests
```

### Production

```bash
npm run build              # Build for production
npm start                  # Start production server
```

### Utilities

```bash
npm run lint               # Lint all code
npm run typecheck          # Check TypeScript types
npm run clean              # Remove all node_modules
npm run reset              # Clean + fresh install
```

### Docker (Alternative)

```bash
npm run docker:up          # Start with Docker Compose
npm run docker:down        # Stop Docker services
```

## 🛠 Tech Stack

- **Monorepo**: Turborepo with npm workspaces
- **Backend**: Node.js + TypeScript + Express + SQLite
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Testing**: Playwright (E2E)
- **Database**: SQLite with better-sqlite3

## 📁 Project Structure

```
administration/
├── server/           # Backend API
├── client/           # React frontend
├── tests/            # E2E tests
├── data/             # SQLite database
├── notes/            # Development notes
└── package.json      # Root scripts
```

## 🔧 Development Workflow

1. **First time setup**:

```bash
npm run setup
```

2. **Daily development**:

```bash
npm run dev:simple
```

3. **Before committing**:

```bash
npm run lint && npm run typecheck && npm test
```

## 🗄 Database

The system uses SQLite.

## 🧪 Testing

E2E tests cover:

- Navigation and UI interactions
- Member CRUD operations
- Event management
- Form validation
- API endpoints

## 🤝 Contributing

1. Make changes to your feature
2. Test locally: `npm run dev:simple`
3. Run tests: `npm test`
4. Lint: `npm run lint`
5. Commit with descriptive message

## 📝 Notes

Development notes and architecture decisions are in `/notes/` directory.

## 🔗 URLs

- **App**: http://localhost:5173
- **API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **API Docs**: http://localhost:3000/api/members, /api/events

---

**Ready for production deployment! 🎉**
