Current State

- You have basic withExpress adapter that provides Express context to Effects
- Auth/authz middleware are integrated into Effect pipelines as functional components
- Request parsing functions use schema validation and inject parsed data into context
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

// Example usage matching current implementation:
router.get('/member/:id', (req, res, next) =>
  Effect.void.pipe(
    withExpress(req, res, next),
    requireAuth(),
    requirePermission('read', 'members'),
    parseParams(memberIdSchema),
    parseQuery(paginationSchema),
    MemberController.getMemberDetails,
    formatOutput(memberDetailsOutputSchema)
  )
)

Implementation Components

1. Express Adapter - Minimal context provider:
```typescript
// From expressAdapter.ts
export function withExpress(req: Request, res: Response, next: NextFunction) {
  return Effect.provideService(Express, { req, res, next });
}
```

2. Request Context Tags - Type-safe request data access:
```typescript
// From http/context.ts
export const Express = Context.GenericTag<IExpress>('@effect-http/Express');
export const ParsedBody = Context.GenericTag<'ParsedBody', unknown>('@effect-http/ParsedBody');
export const ParsedQuery = Context.GenericTag<'ParsedQuery', unknown>('@effect-http/ParsedQuery');
export const ParsedParams = Context.GenericTag<'ParsedParams', unknown>('@effect-http/ParsedParams');
export const ActiveUser = Context.GenericTag<'ActiveUser', Session['user']>('@effect-http/ActiveUser');
```

3. Parser Combinators - Schema-based validation:
```typescript
// From http/parsers.ts
export const parseBody = <A, I = unknown, R = never>(schema: Schema.Schema<A, I, R>) =>
  <E, R2>(effect: Effect.Effect<any, E, R2>): Effect.Effect<any, E | ParseError, R | R2 | IExpress> =>
    Effect.gen(function* () {
      const { req } = yield* Express;
      const parsed = yield* Schema.decodeUnknown(schema)(req.body);
      return yield* effect.pipe(Effect.provideService(ParsedBody, parsed));
    });
```

4. Auth Pipeline Functions:
```typescript
// From http/auth.ts
export const requireAuth = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const session = yield* authenticationCheck();
    return yield* effect.pipe(Effect.provideService(ActiveUser, session.user));
  });
```

5. Output Formatters - RESTful response schemas:
```typescript
// From http/formatters.ts
export const formatOutput = <A, I = unknown>(schema: Schema.Schema<A, I, never>) =>
  <E>(effect: Effect.Effect<any, E, never>): Effect.Effect<SuccessResponse<I>, E | ParseError, never> =>
    effect.pipe(
      Effect.flatMap((data) => Schema.encode(schema)(data)),
      Effect.map((data) => createSuccessResponse(data))
    );
```

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
