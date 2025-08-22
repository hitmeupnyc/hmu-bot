# Effect HTTP Pipeline - Usage Guide

## Overview

The Effect HTTP pipeline system provides a type-safe, composable approach to handling HTTP requests in Express applications. It replaces traditional middleware chains with functional pipelines that leverage Effect's type system for better error handling, observability, and testability.

## Quick Start

### Basic Route Structure

```typescript
import { pipe } from 'effect';
import { effectToExpress } from '~/services/effect/adapters/expressAdapter';
import { 
  parseQuery, 
  parseParams, 
  formatOutput, 
  requireAuth, 
  requirePermission 
} from '~/services/effect/http';

router.get(
  '/users/:id',
  effectToExpress(
    pipe(
      requireAuth(),                    // Authentication
      requirePermission('read', 'users'), // Authorization
      parseParams(IdParamSchema),       // Parse & validate URL params
      fetchUserById,                    // Business logic
      formatOutput(UserSchema)          // Format response
    )
  )
);
```

## Core Components

### 1. Request Parsing

#### Parse URL Parameters
```typescript
import { IdParamSchema, parseParams, useParsedParams } from '~/services/effect/http';

// Define schema for URL parameters
const UserIdSchema = Schema.Struct({
  userId: Schema.NumberFromString.pipe(Schema.int().pipe(Schema.positive()))
});

// Use in pipeline
pipe(
  parseParams(UserIdSchema),
  Effect.flatMap(() => 
    Effect.gen(function* () {
      const { userId } = yield* useParsedParams<{ userId: number }>();
      // userId is guaranteed to be a positive integer
      return yield* getUserById(userId);
    })
  )
)
```

#### Parse Query Parameters
```typescript
import { parseQuery, useParsedQuery, ListQuerySchema } from '~/services/effect/http';

// Use built-in pagination schema
pipe(
  parseQuery(ListQuerySchema), // Includes page, limit, search, sorting
  Effect.flatMap(() =>
    Effect.gen(function* () {
      const query = yield* useParsedQuery<{
        page: number;
        limit: number;
        search?: string;
        sortBy?: string;
        sortOrder: 'asc' | 'desc';
      }>();
      
      return yield* fetchUsers(query);
    })
  )
)

// Custom query schema
const UserFilterSchema = Schema.Struct({
  status: Schema.optional(Schema.Literal('active', 'inactive')),
  department: Schema.optional(Schema.String),
  createdAfter: Schema.optional(Schema.DateFromString)
});

pipe(
  parseQuery(UserFilterSchema),
  Effect.flatMap(() => /* use parsed query */)
)
```

#### Parse Request Body
```typescript
import { parseBody, useParsedBody } from '~/services/effect/http';

const CreateUserSchema = Schema.Struct({
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  name: Schema.String.pipe(Schema.minLength(1)),
  department: Schema.optional(Schema.String)
});

pipe(
  parseBody(CreateUserSchema),
  Effect.flatMap(() =>
    Effect.gen(function* () {
      const userData = yield* useParsedBody<CreateUserInput>();
      // userData is validated and type-safe
      return yield* createUser(userData);
    })
  )
)
```

### 2. Authentication & Authorization

#### Basic Authentication
```typescript
import { requireAuth, AuthUser } from '~/services/effect/http';

pipe(
  requireAuth(),
  Effect.flatMap(() =>
    Effect.gen(function* () {
      const user = yield* AuthUser; // Current authenticated user
      return yield* getUserProfile(user.id);
    })
  )
)
```

#### Permission-Based Authorization
```typescript
import { requirePermission } from '~/services/effect/http';

// Static permission check
pipe(
  requireAuth(),
  requirePermission('update', 'users'),
  // ... rest of pipeline
)

// Dynamic permission check
pipe(
  requireAuth(),
  requirePermission('read', (user) => ({ type: 'user', id: user.id })),
  // ... rest of pipeline
)
```

#### Combined Auth + Permission
```typescript
import { requireAuthWithPermission } from '~/services/effect/http';

pipe(
  requireAuthWithPermission('delete', 'users'),
  // User is authenticated AND has delete permission on users
  // ... rest of pipeline
)
```

### 3. Response Formatting

#### Standard Success Response
```typescript
import { formatOutput, successResponse } from '~/services/effect/http';

// With schema validation
const UserOutputSchema = Schema.Struct({
  id: Schema.Number,
  email: Schema.String,
  name: Schema.String,
  createdAt: Schema.DateFromString
});

pipe(
  fetchUser(userId),
  formatOutput(UserOutputSchema) // Validates and formats output
)

// Simple success response
pipe(
  deleteUser(userId),
  successResponse('User deleted successfully')
)
```

#### Paginated Responses
```typescript
import { paginatedOutput } from '~/services/effect/http';

pipe(
  parseQuery(ListQuerySchema),
  Effect.flatMap(() =>
    Effect.gen(function* () {
      const query = yield* useParsedQuery<ListQuery>();
      const result = yield* fetchUsers(query);
      
      return {
        data: result.users,
        total: result.total,
        page: query.page,
        limit: query.limit
      };
    })
  ),
  paginatedOutput(UserSchema) // Formats as paginated response
)
```

### 4. Error Handling

Errors are automatically handled by the pipeline and converted to appropriate HTTP responses:

```typescript
// Custom domain errors
class UserNotFoundError extends Error {
  readonly _tag = 'UserNotFoundError';
  constructor(public userId: number) {
    super(`User ${userId} not found`);
  }
}

// In your business logic
const fetchUser = (id: number) =>
  Effect.gen(function* () {
    const user = yield* userService.findById(id);
    if (!user) {
      return yield* Effect.fail(new UserNotFoundError(id));
    }
    return user;
  });

// Error will be automatically transformed to appropriate HTTP response
```

## Advanced Features

### Content Negotiation
```typescript
import { withContentNegotiation } from '~/services/effect/http';

pipe(
  fetchUsers(),
  formatOutput(UserSchema),
  withContentNegotiation // Supports JSON and CSV based on Accept header
)
```

### Response Caching
```typescript
import { withCaching } from '~/services/effect/http';

pipe(
  fetchPublicData(),
  formatOutput(DataSchema),
  withCaching(300) // Cache for 5 minutes
)
```

### Custom Headers
```typescript
import { withHeaders } from '~/services/effect/http';

pipe(
  processData(),
  formatOutput(DataSchema),
  withHeaders({
    'X-Processing-Time': performance.now().toString(),
    'X-Version': '1.0'
  })
)
```

## Schema Definitions

### Creating Schemas
```typescript
import { Schema } from 'effect';

// Input validation schema
const CreatePostSchema = Schema.Struct({
  title: Schema.String.pipe(Schema.minLength(1).pipe(Schema.maxLength(200))),
  content: Schema.String.pipe(Schema.minLength(10)),
  tags: Schema.optional(Schema.Array(Schema.String)),
  published: Schema.optional(Schema.Boolean).pipe(
    Schema.withDefaults({
      constructor: () => false,
      decoding: () => false,
    })
  )
});

// Output schema
const PostOutputSchema = Schema.Struct({
  id: Schema.Number,
  title: Schema.String,
  content: Schema.String,
  tags: Schema.Array(Schema.String),
  published: Schema.Boolean,
  createdAt: Schema.DateFromString,
  updatedAt: Schema.DateFromString
});
```

### Built-in Schemas
```typescript
import { 
  IdParamSchema,        // { id: number }
  UuidParamSchema,      // { id: string (UUID) }
  PaginationSchema,     // { page: number, limit: number }
  ListQuerySchema,      // Pagination + sorting + filtering
  SortSchema,           // { sortBy?: string, sortOrder: 'asc' | 'desc' }
  FilterSchema          // { search?: string, status?: string, ... }
} from '~/services/effect/http';
```

## Complete Examples

### CRUD Operations

#### Create Resource
```typescript
router.post(
  '/posts',
  effectToExpress(
    pipe(
      requireAuth(),
      requirePermission('create', 'posts'),
      parseBody(CreatePostSchema),
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const postData = yield* useParsedBody<CreatePostInput>();
          const user = yield* AuthUser;
          
          return yield* createPost({ ...postData, authorId: user.id });
        })
      ),
      formatOutput(PostOutputSchema)
    )
  )
);
```

#### Read Resource
```typescript
router.get(
  '/posts/:id',
  effectToExpress(
    pipe(
      requireAuth(),
      requirePermission('read', 'posts'),
      parseParams(IdParamSchema),
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const { id } = yield* useParsedParams<{ id: number }>();
          return yield* getPostById(id);
        })
      ),
      formatOutput(PostOutputSchema)
    )
  )
);
```

#### List Resources
```typescript
router.get(
  '/posts',
  effectToExpress(
    pipe(
      requireAuth(),
      requirePermission('read', 'posts'),
      parseQuery(ListQuerySchema),
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const query = yield* useParsedQuery<ListQuery>();
          const result = yield* getPosts(query);
          
          return {
            data: result.posts,
            total: result.total,
            page: query.page,
            limit: query.limit
          };
        })
      ),
      paginatedOutput(PostOutputSchema)
    )
  )
);
```

#### Update Resource
```typescript
router.put(
  '/posts/:id',
  effectToExpress(
    pipe(
      requireAuth(),
      requirePermission('update', 'posts'),
      parseParams(IdParamSchema),
      parseBody(UpdatePostSchema),
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const { id } = yield* useParsedParams<{ id: number }>();
          const updateData = yield* useParsedBody<UpdatePostInput>();
          
          return yield* updatePost(id, updateData);
        })
      ),
      formatOutput(PostOutputSchema)
    )
  )
);
```

## Testing

### Pure Function Testing
```typescript
// Test business logic in isolation
describe('getUserProfile', () => {
  it('should return user profile', async () => {
    const result = await Effect.runPromise(
      getUserProfile.pipe(
        Effect.provideService(AuthUser, mockUser),
        Effect.provide(MockUserServiceLive)
      )
    );
    
    expect(result).toEqual(expectedProfile);
  });
});
```

### Pipeline Integration Testing
```typescript
// Test complete pipeline
describe('user API', () => {
  it('should handle user creation', async () => {
    const mockReq = createMockRequest({
      body: { email: 'test@example.com', name: 'Test User' },
      headers: { authorization: 'Bearer valid-token' }
    });
    
    const result = await Effect.runPromise(
      createUserPipeline.pipe(
        Effect.provideService(Express, { req: mockReq, res: mockRes, next: mockNext }),
        Effect.provide(TestLayerLive)
      )
    );
    
    expect(result.success).toBe(true);
  });
});
```

## Migration Strategy

### 1. Start with New Routes
- Implement new endpoints using the Effect pipeline
- Compare side-by-side with traditional Express middleware

### 2. Gradual Conversion
- Convert one route at a time
- Use the provided example patterns
- Test thoroughly before moving to the next route

### 3. Schema Migration
- Convert Zod schemas to Effect Schema
- Update validation logic to use new parsers
- Test schema validation thoroughly

### 4. Cleanup
- Remove old middleware once all routes are migrated
- Update documentation and examples
- Remove deprecated helper functions

## Best Practices

1. **Keep Business Logic Pure**: No Express dependencies in business functions
2. **Use Schema Validation**: Always validate inputs with Effect Schema
3. **Compose Pipelines**: Build reusable pipeline segments
4. **Type Everything**: Leverage TypeScript for compile-time safety
5. **Test Pure Functions**: Focus testing on business logic, not HTTP plumbing
6. **Handle Errors Explicitly**: Use proper Effect error types
7. **Document Schemas**: Include examples and validation rules in comments

## Troubleshooting

### Common Issues

1. **"ParseError" not handled**: Add `ParseError` to error response builder
2. **Schema validation fails**: Check that input data matches schema expectations
3. **Context not available**: Ensure parser functions are called before business logic
4. **Type errors**: Make sure to use the helper functions (`useParsedBody`, etc.)

### Debug Tips

1. Use the test routes (`/api/test/*`) to verify pipeline functionality
2. Check server logs for Effect spans and error details
3. Test schemas in isolation before using in pipelines
4. Use the browser network tab to inspect request/response formats

The Effect HTTP pipeline provides a robust, type-safe foundation for building modern REST APIs with excellent developer experience and runtime safety.