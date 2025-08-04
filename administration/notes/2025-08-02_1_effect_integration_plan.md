# Effect Integration Plan for Server Services

## Overview
This document outlines a comprehensive plan for integrating Effect into the `@server/src/services/` codebase, transitioning from the current Promise-based and class-based architecture to Effect's functional, type-safe approach.

## Current Architecture Analysis

### Existing Patterns
1. **Database Access**: Mix of Kysely (typed) and better-sqlite3 (raw) queries
2. **Error Handling**: Custom `AppError` class with HTTP status codes
3. **Service Architecture**: Class-based services with instance methods
4. **Sync Services**: Inheritance-based pattern with `BaseSyncService`
5. **Dependency Management**: Manual instantiation and singleton patterns

### Key Services
- **BaseSyncService**: Abstract base for sync operations
- **DatabaseService**: Database connection management
- **EventService**: Event management with complex queries
- **MemberService**: Member CRUD with audit logging
- **Sync Services**: Discord, Patreon, Klaviyo, Eventbrite integrations

## Effect Integration Strategy

### Phase 1: Foundation (Week 1)
1. **Install Effect Dependencies**
   ```bash
   npm install effect @effect/schema @effect/platform @effect/platform-node
   ```

2. **Create Effect Service Layer Structure**
   ```
   server/src/services/effect/
   ├── layers/           # Service layers and dependencies
   ├── schemas/          # Data validation schemas
   ├── errors/           # Domain-specific errors
   ├── context/          # Service contexts
   └── utils/            # Effect utilities
   ```

3. **Implement Core Layers**
   - **DatabaseLayer**: Effect wrapper for Kysely/SQLite
   - **ConfigLayer**: Environment configuration
   - **LoggerLayer**: Structured logging with Effect

### Phase 2: Data Validation & Error Handling (Week 1-2)

1. **Schema Definitions** using `@effect/schema`
   ```typescript
   // schemas/Member.ts
   import { Schema } from "@effect/schema"
   
   export const MemberSchema = Schema.Struct({
     id: Schema.Number,
     email: Schema.String.pipe(Schema.pattern(emailRegex)),
     first_name: Schema.String,
     last_name: Schema.String,
     flags: Schema.Number,
     created_at: Schema.Date,
     updated_at: Schema.Date
   })
   ```

2. **Domain Errors**
   ```typescript
   // errors/MemberErrors.ts
   export class MemberNotFound extends Schema.TaggedError<MemberNotFound>()(
     "MemberNotFound",
     { memberId: Schema.Number }
   ) {}
   
   export class EmailAlreadyExists extends Schema.TaggedError<EmailAlreadyExists>()(
     "EmailAlreadyExists", 
     { email: Schema.String }
   ) {}
   ```

### Phase 3: Service Migration (Week 2-3)

1. **DatabaseService → DatabaseLayer**
   ```typescript
   // layers/DatabaseLayer.ts
   export const DatabaseLayer = Layer.effect(
     Database,
     Effect.gen(function* () {
       const config = yield* Config
       const db = yield* Effect.try(() => createKyselyInstance(config))
       
       return {
         query: <T>(fn: (db: Kysely<DB>) => Promise<T>) =>
           Effect.tryPromise({
             try: () => fn(db),
             catch: (error) => new DatabaseError({ error })
           }),
         transaction: <T>(fn: (trx: Transaction<DB>) => Effect.Effect<T>) =>
           Effect.acquireUseRelease(
             Effect.tryPromise(() => db.transaction().execute()),
             fn,
             (trx) => Effect.tryPromise(() => trx.commit())
           )
       }
     })
   )
   ```

2. **MemberService → MemberEffects**
   ```typescript
   // services/effect/MemberEffects.ts
   export const getMemberById = (id: number) =>
     Effect.gen(function* () {
       const db = yield* Database
       
       const member = yield* db.query((db) =>
         db.selectFrom('members')
           .selectAll()
           .where('id', '=', id)
           .where(sql`flags & 1`, '=', 1)
           .executeTakeFirst()
       )
       
       if (!member) {
         return yield* Effect.fail(new MemberNotFound({ memberId: id }))
       }
       
       return yield* Schema.decodeUnknown(MemberSchema)(member)
     })
   ```

### Phase 4: Sync Services Enhancement (Week 3-4)

1. **Effect-based Sync Pattern**
   ```typescript
   // services/effect/SyncEffects.ts
   export const createSyncPipeline = <T>(config: SyncConfig<T>) =>
     Effect.gen(function* () {
       const logger = yield* Logger
       
       return pipe(
         fetchExternalData(config),
         Effect.tap((data) => logger.info("Fetched external data", { count: data.length })),
         Effect.flatMap(validateData(config.schema)),
         Effect.flatMap(processBatch(config.processor)),
         Effect.catchTag("ValidationError", (e) => 
           logError(e).pipe(Effect.as({ synced: 0, errors: 1 }))
         ),
         Effect.retry(
           Schedule.exponential("1 second").pipe(
             Schedule.intersect(Schedule.recurs(3))
           )
         )
       )
     })
   ```

2. **Concurrent Processing**
   ```typescript
   const processBatch = <T>(processor: (item: T) => Effect.Effect<void>) =>
     (items: T[]) =>
       Effect.forEach(items, processor, {
         concurrency: 10,
         batching: true
       })
   ```

### Phase 5: Advanced Patterns (Week 4-5)

1. **Resource Management**
   ```typescript
   export const withDatabase = <R, E, A>(
     effect: Effect.Effect<A, E, R | Database>
   ): Effect.Effect<A, E | DatabaseError, R> =>
     Effect.scoped(
       Effect.gen(function* () {
         const db = yield* Effect.acquireRelease(
           Database.acquire,
           (db) => Database.release(db)
         )
         return yield* Effect.provideService(effect, Database, db)
       })
     )
   ```

2. **Event Streaming**
   ```typescript
   export const webhookStream = Stream.async<WebhookEvent>((emit) => {
     const handler = (event: WebhookEvent) => emit(Effect.succeed(Chunk.of(event)))
     webhookEmitter.on('event', handler)
     return Effect.sync(() => webhookEmitter.off('event', handler))
   }).pipe(
     Stream.mapEffect(processWebhookEvent),
     Stream.retry(Schedule.exponential("1 second"))
   )
   ```

## Migration Approach

### Gradual Migration Strategy
1. **Parallel Implementation**: Create Effect versions alongside existing services
2. **Adapter Layer**: Bridge between Effect and Express endpoints
3. **Feature Flags**: Toggle between implementations
4. **Incremental Rollout**: Migrate one service at a time

### Adapter Pattern Example
```typescript
// adapters/express.ts
export const effectToExpress = <E, A>(
  effect: Effect.Effect<A, E>
) => async (req: Request, res: Response, next: NextFunction) => {
  const result = await Effect.runPromiseExit(
    effect.pipe(
      Effect.provideService(RequestContext, { req, res })
    )
  )
  
  Exit.match(result, {
    onFailure: (cause) => {
      const error = Cause.failureOption(cause)
      if (error._tag === "Some") {
        next(toExpressError(error.value))
      } else {
        next(new Error("Unknown error"))
      }
    },
    onSuccess: (value) => res.json(value)
  })
}
```

## Benefits of Effect Integration

1. **Type Safety**: Compile-time error tracking and guaranteed error handling
2. **Composability**: Build complex workflows from simple, reusable effects
3. **Resource Safety**: Automatic cleanup and proper resource management
4. **Concurrency**: Built-in support for concurrent operations with backpressure
5. **Observability**: Structured logging and tracing out of the box
6. **Testing**: Deterministic testing with controlled environments

## Performance Considerations

1. **Lazy Evaluation**: Effects are descriptions, not executions
2. **Fiber-based Concurrency**: Lightweight compared to Promises
3. **Streaming**: Process large datasets without memory overhead
4. **Caching**: Built-in memoization support

## Monitoring & Debugging

1. **Effect Tracing**: Built-in execution traces
2. **Structured Logging**: Context-aware logging
3. **Metrics**: Integration with OpenTelemetry
4. **Error Reports**: Detailed error causes with stack traces

## Testing Strategy

```typescript
// tests/MemberEffects.test.ts
describe("MemberEffects", () => {
  it("should handle member not found", async () => {
    const test = Effect.gen(function* () {
      const result = yield* getMemberById(999).pipe(
        Effect.flip
      )
      
      expect(result).toBeInstanceOf(MemberNotFound)
    })
    
    await Effect.runPromise(
      test.pipe(
        Effect.provideLayer(TestDatabaseLayer)
      )
    )
  })
})
```

## Next Steps

1. **Week 1**: Set up Effect dependencies and core layers
2. **Week 2**: Migrate MemberService as proof of concept
3. **Week 3**: Implement sync service patterns
4. **Week 4**: Migrate remaining services
5. **Week 5**: Performance optimization and monitoring

This plan provides a structured approach to gradually introducing Effect while maintaining system stability and allowing for rollback if needed.