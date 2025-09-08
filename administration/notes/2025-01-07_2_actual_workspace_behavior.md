# How npm Workspaces + Turborepo Actually Work

## Current State Analysis

### npm Workspaces
1. **Symlinks are working correctly**:
   - `node_modules/api-server` → `../server`
   - `node_modules/web-app` → `../client`
   - `node_modules/e2e` → `../tests`

2. **Package name mapping**:
   - Directory `server/` is published as package `api-server`
   - Directory `client/` is published as package `web-app`
   - Directory `tests/` is published as package `e2e`

3. **Workspace resolution works**:
   - `require('api-server/package.json')` ✅ Works
   - `require('api-server')` ❌ Fails because no `dist/index.js` exists

### Turborepo Configuration

From `turbo.json`:
```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],  // Build dependencies first
      "outputs": ["dist/**", ".next/**"]  // Cache these outputs
    }
  }
}
```

Key insights:
- `^build` means "build all dependencies first"
- Turborepo orchestrates build order based on package.json dependencies
- Currently NO packages declare dependencies on each other!

### The Missing Link: Inter-Package Dependencies

**Current state**: Packages are isolated
```json
// client-sdk/package.json
{
  "dependencies": {
    "@effect/platform": "^0.90.6",
    // NO reference to api-server!
  }
}
```

**What's needed**: Declare workspace dependencies
```json
// client-sdk/package.json
{
  "dependencies": {
    "api-server": "workspace:*",  // npm workspace protocol
    "@effect/platform": "^0.90.6"
  }
}
```

## How Imports Actually Work

### Current (Broken) Approach
```typescript
// client-sdk/src/api/shared.ts
import { eventsApi } from '../../../server/src/api/events/index.js';
```
**Problems**:
- TypeScript follows the path and compiles server files
- Creates .js/.d.ts files in server directory
- Bypasses workspace resolution entirely

### Correct Workspace Approach
```typescript
// client-sdk/src/api/shared.ts
import { eventsApi } from 'api-server/api/events';
```
**Requirements**:
1. `api-server` must be built first (has dist/)
2. `api-server/package.json` needs exports field
3. `client-sdk` must declare `api-server` as dependency

## Package.json Exports Field

The server needs to define what can be imported:

```json
// server/package.json
{
  "name": "api-server",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./api/events": {
      "types": "./dist/api/events/index.d.ts",
      "default": "./dist/api/events/index.js"
    },
    "./api/schemas": {
      "types": "./dist/api/schemas.d.ts", 
      "default": "./dist/api/schemas.js"
    },
    "./package.json": "./package.json"
  }
}
```

## Build Order with Turborepo

When `client-sdk` declares `api-server` as a dependency:

1. Run `npm run build` from root
2. Turborepo sees `client-sdk` depends on `api-server`
3. Builds `api-server` first → creates `server/dist/`
4. Then builds `client-sdk` → can import from `api-server/dist/`

## Why My Implementation Failed

1. **No dependency declaration**: `client-sdk` didn't declare `api-server` as a dependency
2. **No exports field**: `api-server` doesn't define what can be imported
3. **Direct source imports**: Used `../../../server/src` instead of `api-server`
4. **No build artifacts**: `api-server` has no `dist/` folder

Result: TypeScript tried to compile everything, creating a mess.

## The Fix

1. Build `api-server` first to create `dist/`
2. Add proper exports to `server/package.json`
3. Declare `api-server` as dependency in `client-sdk/package.json`
4. Import from package name, not relative paths
5. Let Turborepo handle build orchestration

## Key Learning

**Workspace packages are NOT just folders** - they're actual npm packages that:
- Must be built to have artifacts
- Need proper package.json configuration
- Should be imported by package name
- Have dependencies declared explicitly

The symlinks in `node_modules/` are just for resolution - the packages still need to follow all npm package conventions.