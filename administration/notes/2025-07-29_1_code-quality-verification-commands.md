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
