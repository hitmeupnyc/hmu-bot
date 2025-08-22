# Effect HTTP Pipeline - Patterns & Best Practices

## Core Concepts

### 1. Context-Driven Architecture

The Effect HTTP pipeline uses Context to pass request-scoped data through the pipeline:

```typescript
// Context tags define what data is available
const AuthUser = Context.GenericTag<'AuthUser', SessionUser>('@effect-http/AuthUser');
const ParsedBody = Context.GenericTag<'ParsedBody', unknown>('@effect-http/ParsedBody');

// Pipeline functions inject data into context
const requireAuth = () => <A, E, R>(effect: Effect.Effect<A, E, R>) => 
  Effect.gen(function* () {
    const session = yield* validateSession();
    return yield* effect.pipe(Effect.provideService(AuthUser, session.user));
  });

// Business logic accesses data from context  
const getUserProfile = Effect.gen(function* () {
  const user = yield* AuthUser;
  return yield* getUserById(user.id);
});
```

### 2. Schema-First Validation

Always validate inputs using Effect Schema before processing:

```typescript
// Define schemas for inputs and outputs
const CreateUserSchema = Schema.Struct({
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  name: Schema.String.pipe(Schema.minLength(1)),
});

const UserOutputSchema = Schema.Struct({
  id: Schema.Number,
  email: Schema.String,
  name: Schema.String,
  created_at: Schema.DateFromString,
});

// Use in pipeline
pipe(
  parseBody(CreateUserSchema),
  createUser,
  formatOutput(UserOutputSchema)
)
```

### 3. Pure Business Logic

Separate business logic from HTTP concerns:

```typescript
// ❌ Bad: Coupled to HTTP
export const createUser = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const userData = req.body; // No validation
    const userService = yield* UserService;
    return yield* userService.create(userData);
  });

// ✅ Good: Pure business logic
const createUser = Effect.gen(function* () {
  const userData = yield* useParsedBody<CreateUserInput>();
  const userService = yield* UserService;
  return yield* userService.create(userData);
});
```

## Common Patterns

### 1. Standard CRUD Pipeline

```typescript
// GET /resources/:id
const getResource = pipe(
  requireAuth(),
  requirePermission('read', 'resource'),
  parseParams(IdParamSchema),
  fetchResourceById,
  formatOutput(ResourceSchema)
);

// POST /resources
const createResource = pipe(
  requireAuth(),
  requirePermission('create', 'resource'),
  parseBody(CreateResourceSchema),
  createResourceHandler,
  formatOutput(ResourceSchema)
);

// PUT /resources/:id
const updateResource = pipe(
  requireAuth(),
  requirePermission('update', 'resource'),
  parseParams(IdParamSchema),
  parseBody(UpdateResourceSchema),
  updateResourceHandler,
  formatOutput(ResourceSchema)
);
```

### 2. Paginated List Endpoints

```typescript
const listResources = pipe(
  requireAuth(),
  requirePermission('read', 'resource'),
  parseQuery(ListQuerySchema), // includes pagination, sorting, filtering
  fetchResourceList,
  paginatedOutput(ResourceSchema)
);

const fetchResourceList = Effect.gen(function* () {
  const query = yield* useParsedQuery<ListQuery>();
  const resourceService = yield* ResourceService;
  
  const result = yield* resourceService.list({
    page: query.page,
    limit: query.limit,
    search: query.search,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });
  
  return {
    data: result.items,
    total: result.total,
    page: query.page,
    limit: query.limit
  };
});
```

### 3. Nested Resource Operations

```typescript
// POST /users/:userId/posts
const createUserPost = pipe(
  requireAuth(),
  requirePermission('create', 'post'),
  parseParams(UserIdParamSchema),
  parseBody(CreatePostSchema),
  verifyUserExists,
  createPostForUser,
  formatOutput(PostSchema)
);

const verifyUserExists = Effect.gen(function* () {
  const { userId } = yield* useParsedParams<{ userId: number }>();
  const userService = yield* UserService;
  yield* userService.getById(userId); // Will fail if user doesn't exist
});

const createPostForUser = Effect.gen(function* () {
  const { userId } = yield* useParsedParams<{ userId: number }>();
  const postData = yield* useParsedBody<CreatePostInput>();
  const postService = yield* PostService;
  
  return yield* postService.create({ ...postData, userId });
});
```

### 4. Conditional Authorization

```typescript
// Users can only access their own data unless they're admin
const requireOwnershipOrAdmin = (resourceUserId: number) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    Effect.gen(function* () {
      const user = yield* AuthUser;
      const authService = yield* AuthorizationService;
      
      const isOwner = user.id === resourceUserId;
      const isAdmin = yield* authService.hasRole(user.id, 'admin');
      
      if (!isOwner && !isAdmin) {
        return yield* Effect.fail(new Error('Access denied'));
      }
      
      return yield* effect;
    });

const getUserProfile = pipe(
  requireAuth(),
  parseParams(UserIdParamSchema),
  Effect.flatMap(() => 
    Effect.gen(function* () {
      const { userId } = yield* useParsedParams<{ userId: number }>();
      return yield* fetchUserProfile.pipe(
        requireOwnershipOrAdmin(userId)
      );
    })
  ),
  formatOutput(UserProfileSchema)
);
```

### 5. File Upload Handling

```typescript
const uploadUserAvatar = pipe(
  requireAuth(),
  parseParams(UserIdParamSchema),
  parseFileUpload('avatar', { maxSize: 5 * 1024 * 1024, allowedTypes: ['image/jpeg', 'image/png'] }),
  processAvatarUpload,
  formatOutput(AvatarUrlSchema)
);

// Custom parser for file uploads
const parseFileUpload = (fieldName: string, options: FileUploadOptions) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    Effect.gen(function* () {
      const { req } = yield* Express;
      
      if (!req.file || req.file.fieldname !== fieldName) {
        return yield* Effect.fail(new Error(`File ${fieldName} is required`));
      }
      
      if (req.file.size > options.maxSize) {
        return yield* Effect.fail(new Error('File too large'));
      }
      
      if (!options.allowedTypes.includes(req.file.mimetype)) {
        return yield* Effect.fail(new Error('Invalid file type'));
      }
      
      return yield* effect.pipe(
        Effect.provideService(UploadedFile, req.file)
      );
    });
```

## Error Handling Patterns

### 1. Custom Error Types

```typescript
// Domain-specific errors
export class NotFoundError extends Data.TaggedError('NotFoundError')<{
  readonly id: string;
  readonly resource: string;
}> {}

export class AuthenticationError extends Data.TaggedError(
  'AuthenticationError'
)<{
  readonly reason:
    | 'missing_session'
    | 'invalid_session'
    | 'expired_session'
    | 'auth_service_error';
  readonly message: string;
  readonly cause?: unknown;
}> {}

// Error recovery
const getUserWithFallback = Effect.gen(function* () {
  const { userId } = yield* useParsedParams<{ userId: number }>();
  
  return yield* getUserById(userId).pipe(
    Effect.catchTag('UserNotFoundError', () => 
      Effect.succeed({ id: userId, name: 'Unknown User', email: 'unknown@example.com' })
    )
  );
});
```

### 2. Error Transformation

```typescript
// Transform service errors to HTTP errors
const transformServiceErrors = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.catchTag('DatabaseError', (error) =>
      Effect.fail(new Error('Service temporarily unavailable'))
    ),
    Effect.catchTag('ValidationError', (error) =>
      Effect.fail(new Error(`Invalid input: ${error.message}`))
    )
  );
```

## Performance Optimization

### 1. Request-Level Caching

```typescript
const getCachedUser = pipe(
  requireAuth(),
  parseParams(UserIdParamSchema),
  withCaching(300), // 5 minutes
  fetchUserById,
  formatOutput(UserSchema)
);
```

### 2. Parallel Data Fetching

```typescript
const getUserDashboard = Effect.gen(function* () {
  const { userId } = yield* useParsedParams<{ userId: number }>();
  
  // Fetch data in parallel
  const [user, posts, followers] = yield* Effect.all([
    userService.getById(userId),
    postService.getByUserId(userId),
    followService.getFollowers(userId)
  ]);
  
  return { user, posts, followers };
});
```

### 3. Conditional Processing

```typescript
const getPostWithComments = Effect.gen(function* () {
  const { postId } = yield* useParsedParams<{ postId: number }>();
  const query = yield* useParsedQuery<{ includeComments?: boolean }>();
  
  const post = yield* postService.getById(postId);
  
  if (query.includeComments) {
    const comments = yield* commentService.getByPostId(postId);
    return { ...post, comments };
  }
  
  return post;
});
```

## Testing Strategies

### 1. Pure Function Testing

```typescript
describe('getUserProfile', () => {
  it('should return user profile for valid user ID', async () => {
    const result = await Effect.runPromise(
      getUserProfile.pipe(
        Effect.provideService(ParsedParams, { userId: 1 }),
        Effect.provideService(AuthUser, mockUser),
        Effect.provide(MockUserServiceLive)
      )
    );
    
    expect(result).toEqual(expectedUserProfile);
  });
});
```

### 2. Pipeline Integration Testing

```typescript
describe('user API pipeline', () => {
  it('should handle complete user creation flow', async () => {
    const mockReq = createMockRequest({
      body: validUserData,
      headers: { authorization: 'Bearer valid-token' }
    });
    
    const result = await Effect.runPromise(
      createUserPipeline.pipe(
        Effect.provideService(Express, { req: mockReq, res: mockRes, next: mockNext }),
        Effect.provide(TestLayerLive)
      )
    );
    
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject(expectedUser);
  });
});
```

## Migration Checklist

When migrating a route to the Effect pipeline:

- [ ] ✅ **Convert schemas** from Zod to Effect Schema
- [ ] ✅ **Replace middleware chain** with pipeline functions
- [ ] ✅ **Extract business logic** to pure Effect functions
- [ ] ✅ **Add proper input validation** with schema parsers
- [ ] ✅ **Use context accessors** instead of direct req/res access
- [ ] ✅ **Add response formatting** with output schemas
- [ ] ✅ **Update tests** to use pure function testing
- [ ] ✅ **Add error handling** with proper error types
- [ ] ✅ **Document the pipeline** with clear function names

## Common Pitfalls

1. **❌ Don't access req/res directly** in business logic
2. **❌ Don't mix Express middleware** with Effect pipeline
3. **❌ Don't skip schema validation** for "simple" inputs
4. **❌ Don't forget error handling** for external service calls
5. **❌ Don't make business logic impure** with side effects
6. **✅ Do use context** for request-scoped data
7. **✅ Do compose pipelines** for reusability
8. **✅ Do test pure functions** in isolation
9. **✅ Do handle all error cases** explicitly
10. **✅ Do use schemas** for both input and output validation