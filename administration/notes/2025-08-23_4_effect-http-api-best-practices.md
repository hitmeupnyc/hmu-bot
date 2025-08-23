# Effect HttpApi Best Practices Guide

*Date: 2025-08-23*  
*Migration: Express.js → @effect/platform HttpApi*

## Overview

This document outlines best practices for building REST APIs using `@effect/platform` HttpApi, based on our successful migration from Express.js to Effect's declarative HTTP system.

## Architecture Patterns

### 1. Directory Structure

```
server/src/
├── api/                              # HttpApi definitions
│   ├── index.ts                     # Combined API export
│   ├── members/
│   │   ├── endpoints.ts             # HttpApiEndpoint definitions
│   │   ├── handlers.ts              # Business logic implementation
│   │   └── index.ts                 # Module exports
│   ├── events/
│   │   ├── endpoints.ts
│   │   ├── handlers.ts
│   │   └── index.ts
│   └── health/
│       └── index.ts                 # Simple single-file API
├── middleware/                       # HttpApiMiddleware definitions
│   ├── auth.ts                      # Authentication & authorization
│   ├── audit.ts                     # Audit logging
│   └── rateLimit.ts                 # Rate limiting
├── services/effect/                  # Business logic services
│   ├── layers/                      # Service layer implementations
│   ├── schemas/                     # Domain schemas
│   └── adapters/                    # Integration adapters
└── index.ts                         # Server entry point
```

### 2. Separation of Concerns

**Endpoints (`endpoints.ts`)**
- Define API contract using `HttpApiEndpoint`
- Specify request/response schemas
- Add middleware requirements
- Include OpenAPI annotations

**Handlers (`handlers.ts`)**
- Implement business logic
- Handle service integration
- Manage error mapping
- Use factory pattern to avoid circular dependencies

**Services (`services/effect/`)**
- Pure business logic
- Database interactions
- External integrations
- Domain-specific operations

## Schema Design

### Request/Response Schemas

```typescript
// ✅ Good: Clear, typed schemas
const CreateMemberSchema = Schema.Struct({
  first_name: Schema.String,
  last_name: Schema.String,
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  preferred_name: Schema.optional(Schema.String),
})

// ✅ Good: Reusable parameter schemas
const idParam = HttpApiSchema.param("id", Schema.NumberFromString)

// ✅ Good: Pagination with defaults
const ListQuery = Schema.Struct({
  page: Schema.optional(Schema.NumberFromString.pipe(Schema.positive())),
  limit: Schema.optional(Schema.NumberFromString.pipe(Schema.positive(), Schema.lessThanOrEqualTo(100))),
  search: Schema.optional(Schema.String)
})
```

### Error Schemas

```typescript
// ✅ Good: Typed error classes with HTTP status
class MemberNotFound extends Schema.TaggedError<MemberNotFound>()(
  "MemberNotFound",
  { memberId: Schema.Number },
  HttpApiSchema.annotations({ status: 404 })
) {}

class MemberEmailExists extends Schema.TaggedError<MemberEmailExists>()(
  "MemberEmailExists", 
  { email: Schema.String },
  HttpApiSchema.annotations({ status: 409 })
) {}
```

## Endpoint Definition Patterns

### CRUD Endpoints

```typescript
export const membersGroup = HttpApiGroup.make("members")
  // List with pagination
  .add(
    HttpApiEndpoint.get("listMembers", "/members")
      .addSuccess(Schema.Struct({
        data: Schema.Array(MemberSchema),
        total: Schema.Number,
        page: Schema.Number, 
        limit: Schema.Number,
        totalPages: Schema.Number
      }))
      .setUrlParams(ListQuery)
      .middleware(Authentication)
  )
  
  // Get single resource
  .add(
    HttpApiEndpoint.get("getMember")`/members/${idParam}`
      .addSuccess(MemberSchema)
      .addError(MemberNotFound)
      .middleware(Authentication)
  )
  
  // Create resource
  .add(
    HttpApiEndpoint.post("createMember", "/members")
      .setPayload(CreateMemberSchema)
      .addSuccess(MemberSchema, { status: 201 })
      .addError(MemberEmailExists)
      .middleware(Authentication)
  )
  
  // Update resource
  .add(
    HttpApiEndpoint.put("updateMember")`/members/${idParam}`
      .setPayload(UpdateMemberSchema)
      .addSuccess(MemberSchema)
      .addError(MemberNotFound)
      .addError(MemberEmailExists)
      .middleware(Authentication)
  )
  
  // Delete resource
  .add(
    HttpApiEndpoint.del("deleteMember")`/members/${idParam}`
      .addSuccess(Schema.Struct({ message: Schema.String }))
      .addError(MemberNotFound)
      .middleware(Authentication)
  )
```

## Handler Implementation Patterns

### Factory Pattern for Circular Dependencies

```typescript
// ✅ Good: Factory function avoids circular imports
export const createMembersApiLive = (api: any) => HttpApiBuilder.group(
  api,
  "members", 
  (handlers) =>
    Effect.gen(function* () {
      const memberService = yield* MemberService
      const user = yield* CurrentUser // From middleware
      
      return handlers
        .handle("listMembers", ({ urlParams }) =>
          Effect.gen(function* () {
            const page = urlParams.page ?? 1
            const limit = urlParams.limit ?? 20
            
            const result = yield* memberService.getMembers({
              page, limit, search: urlParams.search
            })
            
            return {
              data: result.members,
              total: result.pagination.total,
              page: result.pagination.page,
              limit: result.pagination.limit,
              totalPages: result.pagination.totalPages
            }
          })
        )
        // ... other handlers
    })
)
```

### Error Mapping

```typescript
// ✅ Good: Map service errors to API errors
.handle("getMember", ({ path }) =>
  Effect.gen(function* () {
    const member = yield* memberService.getMemberById(path.id)
      .pipe(
        Effect.mapError((error) => {
          if (error instanceof NotFoundError) {
            return new MemberNotFound({ memberId: path.id })
          }
          if (error instanceof DatabaseError) {
            throw new Error("Database error occurred")
          }
          throw error
        })
      )
    
    return member
  })
)
```

## Middleware Patterns

### Authentication Middleware

```typescript
export class Authentication extends HttpApiMiddleware.Tag<Authentication>()(
  "Authentication",
  {
    failure: UnauthorizedError,
    provides: CurrentUser,
    security: {
      bearer: HttpApiSecurity.bearer,
      sessionCookie: HttpApiSecurity.apiKey({
        in: "cookie",
        key: "better-auth.session_token"
      })
    }
  }
) {}

export const AuthenticationLive = Layer.effect(
  Authentication,
  Effect.gen(function* () {
    const authService = yield* Auth
    
    return {
      bearer: (token) =>
        Effect.gen(function* () {
          const headers = { authorization: `Bearer ${Redacted.value(token)}` }
          const session = yield* authService.validateSession(headers)
          return session.user
        }),
      
      sessionCookie: (sessionToken) =>
        Effect.gen(function* () {
          const headers = { cookie: `better-auth.session_token=${Redacted.value(sessionToken)}` }
          const session = yield* authService.validateSession(headers)
          return session.user
        })
    }
  })
)
```

## Server Configuration

### Main Server Setup

```typescript
const ServerLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  // Documentation
  Layer.provide(HttpApiSwagger.layer({ 
    path: "/docs",
    openApi: { 
      info: {
        title: "Club Management System API",
        version: "1.0.0",
        description: "RESTful API for managing club members, events, and operations"
      }
    }
  })),
  
  // Cross-cutting concerns
  Layer.provide(HttpApiBuilder.middlewareCors()),
  
  // Authentication & authorization
  Layer.provide(AuthenticationLive),
  Layer.provide(AuthorizationLive),
  
  // API implementation
  Layer.provide(ApiLive),
  
  // Application services
  Layer.provide(ApplicationLive),
  
  // HTTP server
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: PORT }))
)
```

## Schema Version Compatibility

### Record Schema (Effect v3.x)

```typescript
// ✅ Correct for Effect v3.x
environment: Schema.Struct({
  values: Schema.Record({ key: Schema.String, value: Schema.Any }),
  required: Schema.Record({ key: Schema.String, value: Schema.Boolean }),
})

// ❌ Old syntax (Effect v2.x)
environment: Schema.Struct({
  values: Schema.Record(Schema.String, Schema.Any),
  required: Schema.Record(Schema.String, Schema.Boolean),
})
```

### OpenAPI Annotations

```typescript
// ✅ Correct import and usage
import { OpenApi } from "@effect/platform"

export const api = HttpApi.make("MyAPI")
  .annotate(OpenApi.Description, "My API description")
  .annotate(OpenApi.Summary, "API summary")

// ❌ Incorrect - no longer exists
.annotate(HttpApi.Description, "...")
```

## Testing Patterns

### API Testing Strategy

1. **Unit Tests**: Test individual handlers with mocked services
2. **Integration Tests**: Test complete API endpoints with real services
3. **Contract Tests**: Validate OpenAPI specification matches implementation
4. **E2E Tests**: Test through HTTP client against running server

### Health Check Implementation

```typescript
// ✅ Good: Comprehensive health check with debug mode
app.get('/health', (req, res) => {
  const basicHealth = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  }
  
  // Debug mode with detailed system info
  if (req.headers['x-debug-key'] === process.env.DEBUG_KEY) {
    return res.json({ ...basicHealth, debug: await buildDebugInfo() })
  }
  
  res.json(basicHealth)
})
```

## Migration Strategy

### Incremental Migration Approach

1. **Start Simple**: Begin with health check endpoints
2. **Add Infrastructure**: Set up middleware and error handling
3. **Migrate Core APIs**: Start with most important business APIs (Members, Events)
4. **Test Thoroughly**: Validate each migrated endpoint
5. **Remove Legacy**: Clean up old Express routes after validation

### Common Pitfalls

❌ **Don't**: Try to migrate everything at once  
✅ **Do**: Migrate endpoint by endpoint, testing along the way

❌ **Don't**: Ignore circular dependencies in handlers  
✅ **Do**: Use factory pattern for handler creation

❌ **Don't**: Mix Express middleware with HttpApi middleware  
✅ **Do**: Convert all middleware to HttpApiMiddleware pattern

❌ **Don't**: Forget to export layers from service modules  
✅ **Do**: Always export service layers for dependency injection

## Benefits Achieved

### Type Safety
- ✅ Request/response validation at compile time
- ✅ Automatic OpenAPI spec generation
- ✅ Type-safe middleware composition

### Developer Experience  
- ✅ Automatic Swagger UI at `/docs`
- ✅ Clear separation between API contract and implementation
- ✅ Composable middleware system
- ✅ Built-in error handling patterns

### Runtime Benefits
- ✅ Automatic request validation
- ✅ Structured error responses
- ✅ Built-in CORS and security middleware
- ✅ Efficient layer-based dependency injection

## Conclusion

The migration from Express.js to @effect/platform HttpApi provides significant improvements in type safety, developer experience, and maintainability. The declarative approach makes API contracts explicit and self-documenting, while the Effect system ensures robust error handling and composability.

Key success factors:
1. **Follow the directory structure patterns**
2. **Use factory functions to avoid circular dependencies** 
3. **Map service errors to appropriate HTTP status codes**
4. **Leverage middleware for cross-cutting concerns**
5. **Test incrementally during migration**

This architecture scales well and provides a solid foundation for building robust, type-safe REST APIs.