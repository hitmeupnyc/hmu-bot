# Effect HTTP Platform Migration Guide

*Date: 2025-08-27*  
*Migration: Effect services → @effect/platform HttpApi*

## Overview

This guide covers the key `@effect/platform` HTTP modules for building declarative, type-safe REST APIs. These modules represent a more idiomatic approach compared to the traditional Effect service pattern, providing built-in OpenAPI generation, middleware composition, and client derivation.

## Core Modules

### HttpApi - Top-level API Definition

The root container that combines multiple endpoint groups into a cohesive API.

```typescript
import { HttpApi } from '@effect/platform';

const api = HttpApi.make('ClubManagementAPI')
  .add(healthGroup)     // Public endpoints
  .add(membersGroup)    // Protected endpoints
  .annotate(OpenApi.Description, 'Club Management System API');
```

### HttpApiEndpoint - Individual Endpoint Definitions

Declarative endpoint definitions with built-in validation and type safety.

```typescript
import { HttpApiEndpoint, HttpApiSchema } from '@effect/platform';

// GET with path parameters
const getUser = HttpApiEndpoint.get('getUser')`/user/${idParam}`
  .addSuccess(UserSchema)
  .addError(NotFoundError);

// POST with payload validation
const createUser = HttpApiEndpoint.post('createUser', '/users')
  .setPayload(CreateUserSchema)
  .addSuccess(UserSchema, { status: 201 })
  .addError(UniqueError);

// URL parameters with validation
const listUsers = HttpApiEndpoint.get('listUsers', '/users')
  .setUrlParams(Schema.Struct({
    page: Schema.optional(Schema.NumberFromString),
    limit: Schema.optional(Schema.NumberFromString),
    search: Schema.optional(Schema.String)
  }))
  .addSuccess(PaginatedUsersSchema);
```

### HttpApiGroup - Logical Endpoint Organization

Groups related endpoints and applies shared middleware.

```typescript
import { HttpApiGroup } from '@effect/platform';

const membersGroup = HttpApiGroup.make('members')
  .add(getMember)
  .add(createMember)  
  .add(updateMember)
  .add(deleteMember)
  .middleware(Authentication);  // Apply auth to entire group
```

### HttpApiBuilder - Implementation Layer

Connects API definitions to business logic through handlers.

```typescript
import { HttpApiBuilder } from '@effect/platform';

// Group implementation
export const MembersApiLive = HttpApiBuilder.group(
  api,
  'members',
  (handlers) =>
    Effect.gen(function* () {
      const memberService = yield* MemberService;
      
      return handlers
        .handle('getMember', ({ path }) =>
          memberService.getMemberById(path.id).pipe(
            Effect.mapError(mapServiceErrors)
          )
        )
        .handle('createMember', ({ payload }) =>
          memberService.createMember(payload)
        );
    })
);

// Complete API implementation
export const ApiLive = HttpApiBuilder.api(api).pipe(
  Layer.provide(MembersApiLive),
  Layer.provide(AuthenticationLive)
);
```

### HttpApiMiddleware - Cross-cutting Concerns

Type-safe middleware for authentication, logging, and other cross-cutting concerns.

```typescript
import { HttpApiMiddleware, HttpApiSecurity } from '@effect/platform';

// Authentication middleware with security definitions
export class Authentication extends HttpApiMiddleware.Tag<Authentication>()(
  'Authentication',
  {
    failure: UnauthorizedError,
    provides: CurrentUser,
    security: {
      bearer: HttpApiSecurity.bearer,
      sessionCookie: HttpApiSecurity.apiKey({
        in: 'cookie',
        key: 'better-auth.session_token'
      })
    }
  }
) {}

// Implementation
export const AuthenticationLive = Layer.effect(
  Authentication,
  Effect.gen(function* () {
    const authService = yield* Auth;
    
    return {
      bearer: (token) =>
        authService.validateSession({
          authorization: `Bearer ${Redacted.value(token)}`
        }),
      sessionCookie: (sessionToken) =>
        authService.validateSession({
          cookie: `better-auth.session_token=${Redacted.value(sessionToken)}`
        })
    };
  })
);
```

## Architecture Patterns

### Directory Structure

```
server/src/api/
├── index.ts                    # Combined API definition
└── <resource>/
    ├── endpoints.ts           # HttpApiEndpoint definitions
    ├── handlers.ts            # HttpApiBuilder implementations  
    └── index.ts               # Module exports
```

### Separation of Concerns

**endpoints.ts** - Pure API contracts:
```typescript
export const membersGroup = HttpApiGroup.make('members')
  .add(
    HttpApiEndpoint.get('api.members.list', '/api/members')
      .setUrlParams(ListQuerySchema)
      .addSuccess(PaginatedMembersSchema)
      .annotate(OpenApi.Description, 'List members with pagination')
  )
  .add(
    HttpApiEndpoint.post('api.members.create', '/api/members')
      .setPayload(CreateMemberSchema)
      .addSuccess(MemberSchema, { status: 201 })
      .addError(UniqueError)
  );
```

**handlers.ts** - Business logic implementation:
```typescript
export const MembersApiLive = HttpApiBuilder.group(
  membersApi,
  'members', 
  (handlers) =>
    Effect.gen(function* () {
      const memberService = yield* MemberService;
      
      return handlers
        .handle('api.members.list', ({ urlParams }) =>
          memberService.getMembers({
            page: urlParams.page ?? 1,
            limit: urlParams.limit ?? 20,
            search: urlParams.search
          })
        )
        .handle('api.members.create', ({ payload }) =>
          memberService.createMember(payload).pipe(
            Effect.mapError(mapServiceErrors)
          )
        );
    })
);
```

### Error Handling Strategy

```typescript
// Domain errors with HTTP status codes
class NotFoundError extends Schema.TaggedError<NotFoundError>()(
  'NotFoundError',
  { id: Schema.String, resource: Schema.String },
  HttpApiSchema.annotations({ status: 404 })
) {}

// Service error mapping
Effect.mapError((error) => {
  if (error instanceof UnrecoverableError) {
    throw new Error('Unrecoverable error occurred');
  }
  throw error;
})
```

## Migration from Effect Services

### Before: Traditional Effect Service Pattern

```typescript
// Service definition
export interface MemberService {
  getMembers(params: ListParams): Effect.Effect<PaginatedMembers, UnrecoverableError>
  getMemberById(id: number): Effect.Effect<Member, NotFoundError | UnrecoverableError>
}

// Express route handler
app.get('/api/members', (req, res) => {
  const program = Effect.gen(function* () {
    const memberService = yield* MemberService;
    const result = yield* memberService.getMembers(req.query);
    res.json(result);
  });
  
  Effect.runPromise(program.pipe(Effect.provide(MemberServiceLive)));
});
```

### After: @effect/platform HttpApi

```typescript
// Declarative API definition
const membersGroup = HttpApiGroup.make('members')
  .add(
    HttpApiEndpoint.get('listMembers', '/api/members')
      .setUrlParams(ListQuerySchema)
      .addSuccess(PaginatedMembersSchema)
  );

// Type-safe implementation
const MembersApiLive = HttpApiBuilder.group(api, 'members', (handlers) =>
  Effect.gen(function* () {
    const memberService = yield* MemberService;
    
    return handlers.handle('listMembers', ({ urlParams }) =>
      memberService.getMembers(urlParams)
    );
  })
);

// Automatic validation, error handling, and OpenAPI generation
```

### Benefits of Migration

| Aspect | Effect Services | @effect/platform HttpApi |
|--------|----------------|---------------------------|
| **Type Safety** | Manual validation | Automatic request/response validation |
| **Documentation** | Manual Swagger setup | Auto-generated OpenAPI specs |
| **Client Generation** | Manual HTTP clients | Auto-derived type-safe clients |
| **Error Handling** | Custom error mapping | Built-in HTTP status mapping |
| **Middleware** | Manual middleware composition | Declarative middleware system |
| **Testing** | Mock services | Built-in contract testing |

## Server Integration Patterns

### Hybrid Express + Effect Setup

Currently using a hybrid approach during migration:

```typescript
// Express for BetterAuth
app.all('/api/auth/*', (req, res) => {
  authHandler(req, res);
});

// Effect HTTP for API routes
const { handler: effectHandler } = HttpApiBuilder.toWebHandler(ApiLive);
app.use('/api', async (req, res, next) => {
  if (req.path.startsWith('/auth')) return next();
  effectHandler(req, res);
});
```

### Pure Effect HTTP Server

Future target architecture:

```typescript
const ServerLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  Layer.provide(HttpApiSwagger.layer({ path: '/docs' })),
  Layer.provide(HttpApiBuilder.middlewareCors()),
  Layer.provide(AuthenticationLive),
  Layer.provide(ApiLive),
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
);

Layer.launch(ServerLive).pipe(NodeRuntime.runMain);
```

## Key Migration Patterns

### 1. Factory Pattern for Circular Dependencies

Avoid circular imports between API definitions and handlers:

```typescript
// handlers.ts
export const createMembersApiLive = (api: any) => 
  HttpApiBuilder.group(api, 'members', (handlers) => {
    // Implementation
  });

// index.ts  
export const ApiLive = HttpApiBuilder.api(api).pipe(
  Layer.provide(createMembersApiLive(api))
);
```

### 2. Middleware Composition

```typescript
const api = HttpApi.make('API')
  .add(publicGroup)                    // No auth required
  .middleware(Authentication)          // Everything below requires auth
  .add(protectedGroup);
```

### 3. Progressive Migration

1. **Start with health endpoints** - Simple, no dependencies
2. **Add core business APIs** - Members, Events, etc.
3. **Migrate authentication** - BetterAuth → HttpApiMiddleware  
4. **Remove Express dependency** - Pure Effect HTTP server

## Testing Strategies

```typescript
// Contract testing - validate API matches implementation
const spec = OpenApi.fromApi(api);

// Integration testing - test full HTTP stack
const testClient = HttpApiClient.make(api, { baseUrl: 'http://localhost:3000' });

// Unit testing - test handlers with mocked services
const testHandler = HttpApiBuilder.group(api, 'members', handlers).pipe(
  Layer.provide(MockMemberServiceLive)
);
```

## Key Documentation References

- **Primary Documentation**: [Effect Platform HTTP API](https://effect.website/docs/platform/http-api)
- **Migration Best Practices**: [`notes/2025-08-23_4_effect-http-api-best-practices.md`](./2025-08-23_4_effect-http-api-best-practices.md)
- **Effect Service Patterns**: [`notes/EFFECT.md`](./EFFECT.md)
- **Effect Documentation Index**: https://effect.website/llms.txt
- **Platform Module Reference**: https://raw.githubusercontent.com/Effect-TS/effect/refs/heads/main/packages/platform/README.md

## Common Patterns & Quick Reference

### Basic CRUD Endpoint Group

```typescript
const crudGroup = HttpApiGroup.make('resource')
  .add(HttpApiEndpoint.get('list', '/resource').addSuccess(Schema.Array(ResourceSchema)))
  .add(HttpApiEndpoint.get('get')`/resource/${idParam}`.addSuccess(ResourceSchema))
  .add(HttpApiEndpoint.post('create', '/resource').setPayload(CreateSchema).addSuccess(ResourceSchema))
  .add(HttpApiEndpoint.put('update')`/resource/${idParam}`.setPayload(UpdateSchema).addSuccess(ResourceSchema))
  .add(HttpApiEndpoint.del('delete')`/resource/${idParam}`.addSuccess(DeleteResponseSchema));
```

### Error Handling

```typescript
// Service errors → HTTP errors
Effect.mapError((error) => {
  switch (error._tag) {
    case 'NotFoundError':
      return new HttpApiError.NotFound();
    case 'ValidationError':
      return new HttpApiError.BadRequest();
    case 'DatabaseError':
      throw new Error('Internal server error');
  }
});
```

### Middleware Application

```typescript
endpoint.middleware(Auth)
group.middleware(Auth)
api.middleware(Auth)
```

This architecture provides a solid foundation for building type-safe, self-documenting REST APIs with Effect's functional programming benefits.
