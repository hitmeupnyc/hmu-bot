# HTTP API Overview - Club Management System

## Architecture
The API is built using **@effect/platform** with Effect-TS, providing type-safe, functional programming patterns. It runs on Express.js (port 3000) with the Effect API mounted at `/api/*`.

## File Structure
```
server/src/api/
├── index.ts           # Main API composition & layers
├── auth.ts            # Authentication middleware
├── errors.ts          # Common error types
├── schemas.ts         # Shared validation schemas
├── auditLogging.ts    # Audit middleware
│
├── health/
│   └── index.ts       # Health check endpoints
│
├── members/
│   ├── index.ts       # Exports
│   ├── endpoints.ts   # Route definitions
│   ├── handlers.ts    # Business logic
│   └── schemas.ts     # Member schemas
│
├── events/
│   ├── index.ts       # Exports
│   ├── endpoints.ts   # Route definitions
│   ├── handlers.ts    # Business logic
│   └── schemas.ts     # Event schemas
│
├── flags/
│   ├── index.ts       # Exports
│   ├── endpoints.ts   # Route definitions
│   ├── handlers.ts    # Business logic
│   └── schemas.ts     # Flag schemas
│
└── audit/
    ├── index.ts       # Exports
    ├── endpoints.ts   # Route definitions
    └── handlers.ts    # Business logic
```

## Core Structure

### 1. API Composition (`api/index.ts`)
- Main API is composed of domain-specific groups (health, members, events, flags, audit)
- Uses `HttpApi.make()` to create the API definition
- Applies authentication middleware globally (except health endpoints)
- Provides layers for dependency injection (DatabaseLive, AuthLive)

### 2. Authentication (`api/auth.ts`)
- Session-based authentication via BetterAuth cookies
- `AuthMiddleware` validates session tokens from `better-auth.session_token` cookie
- Provides `CurrentUser` context for authenticated endpoints
- Returns 401 for unauthorized access, 403 for permission denied

## API Groups

### Health API (`/api/health/*`)
- **No authentication required**
- `GET /api/health` - Basic health check (database connectivity, version, environment)
- `GET /api/health/env` - Environment configuration status
- Debug mode available with `x-debug-key` header for detailed system info

### Members API (`/api/members/*`)
**CRUD:**
- `GET /api/members` - List members with pagination/search
- `GET /api/members/:id` - Get specific member
- `POST /api/members` - Create new member
- `PUT /api/members/:id` - Update member
- `DELETE /api/members/:id` - Delete member

**Additional:**
- `POST /api/members/:id/note` - Add note to member profile

### Events API (`/api/events/*`)
**CRUD:**
- `GET /api/events` - List events with pagination/search
- `GET /api/events/:id` - Get specific event
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

**Additional:**
- `GET /api/events/:id/flags` - List event flags
- `POST /api/events/:id/flags/:flagId` - Grant flag to event

### Flags API (`/api/flags/*`)
**CRUD:**
- `GET /api/flags` - List flags
- `GET /api/flags/:id` - Get specific flag
- `POST /api/flags` - Create new flag
- `PUT /api/flags/:id` - Update flag
- `DELETE /api/flags/:id` - Delete flag

### Audit API (`/api/audit/*`)
- `GET /api/audit` - Query audit logs
- `GET /api/audit/:id` - Get specific audit entry

## Common Patterns

### 1. Request/Response Schemas
- All endpoints use Effect Schema for validation
- Common schemas in `api/schemas.ts`:
  - `ListQuerySchema` - pagination (page, limit), sorting, filtering
  - `EmailSchema`, `NonEmptyStringSchema` - field validation
  - Response includes metadata (total, page, limit, totalPages)

### 2. Error Handling (`api/errors.ts`)
- Structured error types with HTTP status codes:
  - `NotFoundError` (404)
  - `UniqueError` (409)
  - `ParseError` (400)
  - `DatabaseError` (500)
  - `UnauthorizedError` (401)
  - `ForbiddenError` (403)

### 3. Handler Pattern
- Each API group follows consistent structure:
  - `endpoints.ts` - Endpoint definitions with schemas
  - `handlers.ts` - Implementation using `HttpApiBuilder.group()`
  - `schemas.ts` - Domain-specific schemas
  - `index.ts` - Exports

### 4. Database Integration
- Uses Kysely query builder with SQLite
- `DatabaseService` injected via Effect layers
- Transactions supported for complex operations
- Audit logging middleware tracks all mutations

## Usage Example

```typescript
// Client request
fetch('http://localhost:3000/api/members?page=1&limit=20&search=john', {
  headers: {
    'Content-Type': 'application/json'
  }
})

// Response
{
  "data": [...], // Array of members
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

## Key Features
- **Type Safety**: Full TypeScript with Effect schemas
- **Authentication**: Session-based via BetterAuth
- **Pagination**: Standard pagination on list endpoints
- **Search/Filter**: Query parameter support
- **Audit Logging**: Automatic tracking of mutations
- **Error Handling**: Consistent error responses
- **OpenAPI**: Annotations for documentation generation

The API follows RESTful conventions with a functional programming approach, emphasizing type safety and composability through Effect-TS patterns.