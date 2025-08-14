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
# Force any existing server to stop, then run in the background
npm run ports:clear; npm run dev > /dev/null 2>&1 & 

npm run dev         # Start everything
npm run dev:e2e     # Start everything for E2E test run
npm test            # Run tests
npm run test:e2e    # Run E2E tests
npm run lint        # Check code quality
npm run typecheck   # Check types
npm run ports:clear # Clear ports
```

## File Structure

```
administration/
├── server/src/ # API server
│   ├── routes/ # Route definitions
│   │   └── memberRoutes.ts # Thin routing layer
│   ├── controllers/ # Business logic
│   │   ├── # business logic used in routes
│   │   └── helpers/ # Shared utilities
│   └── services/
│       └── effect/ # See also notes/EFFECT.md
│           ├── layers/ # Database layer with resource management
│           ├── context/ # Database service interface & factory
│           ├── schemas/ # Shared schemas (audit, Discord, etc.)
│           ├── errors/ # Specific errors
│           ├── examples/ # Usage examples and Express adapters
│           └── # business logic
├── client/src/ # React frontend  
│   ├── routes/ # Route definitions
│   ├── components/ # UI components
│   ├── pages/ # Page components
│   ├── hooks/ # Custom hooks
│   ├── types/ # Custom types
│   ├── features/ # Feature folders
│   │   ├── FeatureName/
│   │   │   ├── components/ # UI components
│   │   │   │   └── index.ts # Barrel file export
│   │   │   └── hooks/ # Custom hooks
│   └── lib/
│       ├── App.tsx
│       └── main.tsx
├── tests/ # E2E tests
└── notes/ # Technical decisions
```

## Before Committing

```bash
npm run lint && npm run typecheck && npm test
```

- notes/EFFECT.md

