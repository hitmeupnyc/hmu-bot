## Memory Management Guidelines

- You can reliably restart the app by using `lsof -ti:5173 -ti:3000 | xargs kill; npm run dev > /dev/null 2>&1 &`
  - You must always use ` > /dev/null 2>&1 &` when you run something in the background.
- `/Users/vcarl/workspace/hmu-product/administration` is the project root. You can go in administration/client/ and administration/server/, but when starting the app, do so from administration/.
- You expect to be able to access an IDE. If you can't, prompt me about it.
- Write your thoughts in `/notes`, especially if it will help you remember important implementation details later.
- Your notes must be named consistently with a date prefix in the format `YYYY-MM-DD_X_title.md` where X is a monotonically increasing integer.
- This project uses sqlite, so you can inspect the database yourself. You can make your own dummy data, but don't do anything destructive, and make sure to describe how to reverse any DB changes.
- Prefer using your Playwright MCP over curl.
- When possible, avoid storing boolean values. Bitfields as flags are preferable to booleans in all situations, bitfields and flags.
- Always use React Query in client apps.

This set of commands provides comprehensive verification of:

1. Code style and consistency (linting)
2. Type safety (TypeScript)
3. Dead code detection (Knip)
4. Functionality (testing)
5. Build integrity (compilation)
6. Database operations (migrations/seeding)
7. Containerized deployment (Docker)
8. End-to-end behavior (E2E tests)

Always run these before considering code ready for production deployment.

# Code Quality Verification Commands

## 1. Static Analysis and Linting

```bash
# Run linting across all workspaces
npm run lint

# Run linting for specific services
npm run lint:server
npm run lint:client

# Check for unused/dead code
npm run deadcode
npm run deadcode:production
```

## 2. Type Checking

```bash
# Type check all workspaces
npm run typecheck

# Type check specific services
npm run typecheck:server
npm run typecheck:client
```

## 3. Testing

```bash
# Run all tests
npm run test

# Run tests for specific services
npm run test:server
npm run test:client
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 4. Build Verification

```bash
# Build all services
npm run build

# Build specific services
npm run build:server
npm run build:client

# Test Docker builds
docker compose build

# Test full Docker environment
docker compose up --build
```

## 5. Database Operations (Server-specific)

```bash
# Run database migrations
npm run db:migrate:latest

# Seed the database
npm run db:seed

# Generate database types
npm run db:codegen
```

# Complete Verification Workflow

```bash
# 1. Install dependencies
npm install

# 2. Static analysis
npm run lint
npm run typecheck
npm run deadcode

# 3. Unit and integration tests
npm run test

# 4. Build verification
npm run build

# 5. Database setup (if needed)
npm run db:migrate:latest
npm run db:seed

# 6. Docker build verification
docker compose build

# 7. End-to-end testing
npm run test:e2e

# 8. Full environment test
docker compose up --build
```
