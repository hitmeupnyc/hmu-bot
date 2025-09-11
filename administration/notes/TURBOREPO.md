# Turborepo: Complete Guide to Monorepo Management

## Table of Contents
1. [Introduction](#introduction)
2. [Core Concepts](#core-concepts)
3. [Running Scripts Across the Monorepo](#running-scripts-across-the-monorepo)
4. [Sharing Code Between Projects](#sharing-code-between-projects)
5. [Configuration Deep Dive](#configuration-deep-dive)
6. [Best Practices](#best-practices)
7. [Practical Examples](#practical-examples)
8. [Advanced Features](#advanced-features)

## Introduction

Turborepo is a high-performance build system for JavaScript and TypeScript codebases, written in Rust. It's designed to scale monorepos and make workflows faster through intelligent caching, parallel execution, and task orchestration.

### Key Benefits
- **Performance**: 40-85% faster build times through caching and parallelization
- **Scalability**: Handles large monorepos with multiple interdependent packages
- **Simplicity**: Uses existing package.json scripts and minimal configuration
- **Tool Agnostic**: Works with npm, yarn, pnpm, and any build tools
- **Remote Caching**: Share build artifacts across team members and CI

## Core Concepts

### Package Graph
Turborepo automatically understands relationships between packages using dependencies in package.json files. This creates an internal Package Graph that optimizes task execution order and enables intelligent caching.

### Task Dependencies
Tasks can depend on other tasks within the same package or across packages. Turborepo uses this information to:
- Execute tasks in the correct order
- Run independent tasks in parallel
- Cache task outputs for faster subsequent runs

### Caching System
Turborepo caches task outputs based on:
- Input files (source code, config files)
- Task configuration
- Dependencies and their outputs
- Environment variables (when specified)

## Running Scripts Across the Monorepo

### Basic Command Structure
```bash
# Run a task across all packages that define it
turbo run build

# Run multiple tasks
turbo run build test lint

# Run with specific filters
turbo run build --filter=web-app
turbo run test --filter=api-server

# Force parallel execution (ignore dependencies)
turbo run dev --parallel
```

### Task Execution Flow
1. Turborepo analyzes the Package Graph
2. Determines task dependencies using turbo.json configuration
3. Executes tasks in optimal order (parallel when possible)
4. Caches outputs for future runs

### Filtering Tasks
```bash
# Run only in specific packages
turbo run build --filter=web-app
turbo run build --filter=api-server

# Run in packages matching a pattern
turbo run test --filter="*-app"

# Exclude packages
turbo run build --filter=!tests
```

## Sharing Code Between Projects

### Internal Packages Structure
Recommended monorepo structure:
```
project/
├── apps/           # Applications and services
│   ├── web-app/
│   └── api-server/
├── packages/       # Shared libraries and tools
│   ├── ui/
│   ├── utils/
│   └── types/
└── turbo.json
```

### Two Strategies for Internal Packages

#### 1. Just-in-Time Packages (TypeScript without build step)
Best for TypeScript-only packages consumed by bundlers:

```json
// packages/utils/package.json
{
  "name": "@repo/utils",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  }
}
```

#### 2. Compiled Packages
Best for packages that need compilation or are consumed by Node.js:

```json
// packages/ui/package.json
{
  "name": "@repo/ui",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  }
}
```

### Using Internal Packages
Add workspace dependencies in consuming packages:

```json
// apps/web-app/package.json
{
  "dependencies": {
    "@repo/utils": "workspace:*",
    "@repo/ui": "workspace:*"
  }
}
```

Then import normally:
```typescript
import { formatDate } from '@repo/utils';
import { Button } from '@repo/ui';
```

## Configuration Deep Dive

### turbo.json Structure
```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "stream",
  "remoteCache": {
    "enabled": true
  },
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"],
      "cache": true
    },
    "dev": {
      "cache": false,
      "persistent": true,
      "dependsOn": ["^build:sdk"]
    },
    "test": {
      "dependsOn": ["build"],
      "inputs": ["$TURBO_DEFAULT$", "playwright.config.*"],
      "outputs": ["coverage/**"]
    }
  }
}
```

### Key Configuration Options

#### dependsOn
Specifies task dependencies:
```json
{
  "build": {
    "dependsOn": ["^build"]  // Run build in dependencies first
  },
  "test": {
    "dependsOn": ["build"]   // Run build in same package first
  }
}
```

#### inputs
Files to include in cache hash:
```json
{
  "build": {
    "inputs": [
      "$TURBO_DEFAULT$",  // All tracked files
      ".env*",           // Environment files
      "tsconfig*.json"   // TypeScript configs
    ]
  }
}
```

#### outputs
Files/directories to cache:
```json
{
  "build": {
    "outputs": [
      "dist/**",
      ".next/**",
      "!.next/cache/**"  // Exclude cache directory
    ]
  }
}
```

#### cache
Control caching behavior:
```json
{
  "dev": {
    "cache": false  // Don't cache long-running tasks
  },
  "build": {
    "cache": true   // Cache build outputs (default)
  }
}
```

#### persistent
For long-running tasks:
```json
{
  "dev": {
    "persistent": true,  // Task never exits
    "cache": false
  }
}
```

## Best Practices

### Repository Structure
1. **Separate apps from packages**: Use `apps/` for applications, `packages/` for shared code
2. **Logical grouping**: Group related packages together
3. **Clear naming**: Use scoped package names like `@repo/package-name`

### Dependency Management
1. **Install where used**: Put dependencies in the package that uses them
2. **Minimal root dependencies**: Only repo management tools at root
3. **Workspace references**: Use `workspace:*` for internal dependencies
4. **Avoid cross-package file access**: Never use `../` to access other packages

### Task Configuration
1. **Define outputs**: Always specify what files tasks produce
2. **Use appropriate caching**: Cache build tasks, don't cache dev tasks
3. **Leverage dependencies**: Use `dependsOn` to ensure correct execution order
4. **Optimize inputs**: Include only relevant files in cache hash

### Performance Optimization
1. **Parallel execution**: Let Turborepo run independent tasks in parallel
2. **Remote caching**: Enable for team collaboration and CI speedup
3. **Incremental builds**: Structure tasks to enable incremental execution
4. **Filter strategically**: Use filters to run only necessary tasks

## Practical Examples

### Current Project Analysis
Your project structure:
```
administration/
├── client/     (web-app workspace)
├── server/     (api-server workspace)
├── tests/      (tests workspace)
└── turbo.json
```

### Example Workflows

#### Development
```bash
# Start all dev servers in parallel
npm run dev
# Equivalent to: turbo run dev --parallel

# Start only web app
turbo run dev --filter=web-app
```

#### Building
```bash
# Build everything with proper dependencies
npm run build
# Equivalent to: turbo run build

# Build just the API server and its dependencies
turbo run build --filter=api-server
```

#### Testing
```bash
# Run all tests
npm run test

# Run only unit tests (exclude e2e)
npm run test:unit
# Equivalent to: turbo run test --filter=!e2e
```

### Your Current Configuration Analysis
```json
{
  "build": {
    "dependsOn": ["^build"],        // Build dependencies first
    "inputs": ["$TURBO_DEFAULT$", ".env*"],
    "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
  },
  "dev": {
    "cache": false,                 // Don't cache dev server
    "persistent": true,             // Long-running task
    "dependsOn": ["^build:sdk"]     // Build SDK before starting dev
  },
  "test": {
    "dependsOn": ["build"],         // Build before testing
    "inputs": ["$TURBO_DEFAULT$", "playwright.config.*"]
  }
}
```

This configuration ensures:
- SDKs are built before dev servers start
- Tests run against built code
- Development servers don't interfere with caching
- Playwright config changes invalidate test cache

## Advanced Features

### Remote Caching
Enable team-wide cache sharing:
```json
{
  "remoteCache": {
    "enabled": true
  }
}
```

Connect to Vercel for hosting:
```bash
npx turbo login
npx turbo link
```

### Package-Specific Configuration
Override global config in individual packages:
```json
// packages/ui/turbo.json
{
  "extends": ["//"],
  "tasks": {
    "build": {
      "inputs": ["src/**", "package.json", "tsconfig.json"]
    }
  }
}
```

### Long-Running Dependencies
For tasks that need other tasks running simultaneously:
```json
{
  "dev:frontend": {
    "with": ["dev:api"],  // Run API dev server alongside
    "persistent": true,
    "cache": false
  }
}
```

### Environment Variables
Include env vars in cache hash:
```json
{
  "build": {
    "env": ["NODE_ENV", "API_URL"],
    "inputs": ["$TURBO_DEFAULT$", ".env*"]
  }
}
```

### Concurrency Control
Limit parallel task execution:
```bash
# Limit to 4 concurrent tasks
turbo run build --concurrency=4

# Use 50% of available CPUs
turbo run test --concurrency=50%

# Force serial execution
turbo run build --concurrency=1
```

### Pipeline Visualization
Understand task execution:
```bash
# Generate dependency graph
turbo run build --graph

# Dry run to see what would execute
turbo run build --dry-run
```

## Troubleshooting

### Common Issues
1. **Cache misses**: Check inputs configuration
2. **Wrong execution order**: Verify dependsOn configuration
3. **Slow builds**: Enable remote caching and check parallelization
4. **Import errors**: Ensure proper workspace dependency declarations

### Debugging Commands
```bash
# Verbose output
turbo run build --verbose

# Force no cache
turbo run build --force

# Show why cache missed
turbo run build --verbose | grep "cache miss"
```

### Best Debugging Practices
1. Use `--dry-run` to understand execution plan
2. Check `--verbose` output for cache behavior
3. Verify package.json scripts are correct
4. Ensure workspace dependencies are properly declared

## Conclusion

Turborepo transforms monorepo development by providing intelligent task orchestration, powerful caching, and seamless code sharing. When properly configured, it can dramatically improve build times and developer experience while maintaining clean separation between packages.

The key to success with Turborepo is:
1. **Proper task configuration** with clear dependencies and outputs
2. **Strategic caching** for build tasks and no caching for dev tasks
3. **Clean package boundaries** with proper workspace dependencies
4. **Leveraging parallelization** for independent tasks

Your current setup already demonstrates many best practices with proper task dependencies, SDK building, and separation between development and production builds.