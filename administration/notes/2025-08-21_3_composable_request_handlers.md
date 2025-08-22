Current State

- You have basic effectToExpress adapter that runs Effects and handles errors
- Auth/authz middleware are separate Express functions, not integrated into Effect pipelines
- Request extraction functions (extractId, extractBody) exist but lack schema validation
- Services are provided via a single ApplicationLive layer

Industry HTTP Pipeline Patterns

1. Functional composition (Haskell/Scala): Request → Response as pure functions
2. Middleware chains (Express/Koa): Sequential transformations with shared context
3. Decoder/Encoder pipelines (io-ts, zod): Type-safe parsing with branded types
4. Context propagation (Go, Rust): Request-scoped values through handler chains

Proposed Effect-Based HTTP Pipeline API

Core Design Principles

Type Safety Through Context/Layers:
- Context for request-scoped data (parsed body, query, params)
- Layers for shared services and dependencies
- Schema for validation and transformation

Why Context vs Layer?
- Context: Request-specific data that changes per request (body, auth user, etc.)
- Layer: Shared services/config that remain constant across requests

Detailed API Design

// Example usage matching your desired style:
router.get(
  '/member/:id',
  effectToExpress(
    pipe(
      withRequestObservability(),
      requireAuth(),
      requirePermission('read', 'members'),
      parseParams(memberIdSchema),
      parseQuery(paginationSchema),
      MemberController.getMemberDetails,
      formatOutput(memberDetailsOutputSchema)
    )
  )
)

Implementation Components

1. Request Context Tags - Type-safe request data access:
// Tags for request-scoped data
const ParsedBody = Context.GenericTag<'ParsedBody', unknown>()
const ParsedQuery = Context.GenericTag<'ParsedQuery', unknown>()
const ParsedParams = Context.GenericTag<'ParsedParams', unknown>()
const AuthUser = Context.GenericTag<'AuthUser', SessionUser>()
const RequestMeta = Context.GenericTag<'RequestMeta', RequestMetadata>()

2. Parser Combinators - Schema-based validation:
// Parse and inject into context
const parseBody = <A>(schema: Schema.Schema<A>) =>
  <R>(effect: Effect<any, any, R | ParsedBody<A>>) =>
    Effect.gen(function* () {
      const req = yield* ExpressRequest
      const parsed = yield* Schema.decode(schema)(req.body)
      return yield* effect.pipe(
        Effect.provideService(ParsedBody, parsed)
      )
    })

3. Auth Pipeline Functions:
const requireAuth = () =>
  <R>(effect: Effect<any, any, R | AuthUser>) =>
    Effect.gen(function* () {
      const headers = yield* RequestHeaders
      const session = yield* Auth.validateSession(headers)
      return yield* effect.pipe(
        Effect.provideService(AuthUser, session.user)
      )
    })

4. Output Formatters - RESTful response schemas:
const formatOutput = <A>(schema: Schema.Schema<A>) =>
  (effect: Effect<any, any, any>) =>
    effect.pipe(
      Effect.map(data => Schema.encode(schema)(data)),
      Effect.map(createSuccessResponse)
    )

const paginatedOutput = <A>(schema: Schema.Schema<A>) =>
  (effect: Effect<{ data: A[], total: number }, any, any>) =>
    effect.pipe(
      Effect.map(({ data, total }) => {
        const query = yield* ParsedQuery
        return createPaginatedResponse(
          Schema.encode(schema)(data),
          { page: query.page, limit: query.limit, total }
        )
      })
    )

Comparison: Context vs Layer vs Other Approaches

| Approach     | Use Case              | Pros                                         | Cons                         |
|--------------|-----------------------|----------------------------------------------|------------------------------|
| Context      | Request data          | Type-safe, composable, explicit dependencies | More verbose setup           |
| Layer        | Services/config       | Automatic injection, reusable                | Not for request-scoped data  |
| Reader Monad | Dependency injection  | Pure functional                              | Complex for beginners        |
| State Monad  | Mutable request state | Familiar pattern                             | Side effects, harder to test |

Benefits of This Design

1. Type Safety: Each parser adds its output type to the context
2. Composability: Functions compose naturally with pipe()
3. Testability: Each function is isolated and pure
4. Error Handling: Unified through Effect's error channel
5. Observability: Built-in via Effect spans
6. RESTful Standards: Pagination, filtering, sorting helpers included

Migration Path

1. Create base pipeline functions (auth, parsing, formatting)
2. Gradually replace Express middleware with Effect functions
3. Move controller logic into Effect pipelines
4. Unify error handling through Effect error types
