# Effect HTTP Pipeline Migration - Before vs After

## Overview

This document compares the traditional Express middleware approach with the new Effect-based HTTP pipeline system, demonstrating the benefits in type safety, composability, and maintainability.

## Before: Traditional Express Middleware

```typescript
// memberRoutes.ts - Traditional approach
router.get(
  '/:id',
  requireAuth,                           // Express middleware
  requirePermission('read', 'members'),  // Express middleware
  readOnlyLimiter,                       // Express middleware
  validate({ params: idParamSchema }),   // Zod validation middleware
  auditMiddleware('member'),             // Express middleware
  effectToExpress(MemberController.getMember)  // Effect wrapper
);

// MemberController.ts - Traditional controller
export const getMember = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const id = yield* extractId(req);     // Manual extraction
    const memberService = yield* MemberService;
    const member = yield* memberService.getMemberById(id);
    
    return createSuccessResponse(member); // Manual response formatting
  });
```

### Issues with Traditional Approach:

1. **Mixed Paradigms**: Express middleware + Effect controllers
2. **No Type Safety**: Request data types not enforced through pipeline
3. **Manual Extraction**: `extractId(req)` bypasses validation
4. **Scattered Logic**: Auth, validation, business logic in different places
5. **Testing Complexity**: Need to mock Express req/res objects
6. **Error Handling**: Mixed Express and Effect error handling

## After: Effect HTTP Pipeline

```typescript
// memberRouteExample.ts - New pipeline approach
router.get(
  '/:id',
  effectToExpress(
    pipe(
      requireAuth(),                    // Effect function
      requirePermission('read', 'members'), // Effect function
      parseParams(IdParamSchema),       // Schema validation + context injection
      getMemberById,                    // Pure business logic
      formatOutput(MemberSchema)        // Response formatting
    )
  )
);

// Pure business logic function
const getMemberById = Effect.gen(function* () {
  const { id } = yield* useParsedParams<{ id: number }>();
  const memberService = yield* MemberService;
  return yield* memberService.getMemberById(id);
});
```

### Benefits of New Approach:

1. **Type Safety**: Each pipeline step declares input/output types
2. **Pure Functional**: All functions are pure Effects
3. **Composable**: Easy to reorder, add, or remove pipeline steps
4. **Context-Driven**: Request data flows through typed context
5. **Testable**: No Express dependencies in business logic
6. **Unified Error Handling**: All errors flow through Effect error channel

## Detailed Comparison

### Type Safety

**Before:**
```typescript
const id = yield* extractId(req); // Could be NaN, no validation
const query = req.query as any;   // Any type, no safety
```

**After:**
```typescript
const { id } = yield* useParsedParams<{ id: number }>(); // Guaranteed number
const query = yield* useParsedQuery<MemberQuery>();      // Type-safe query
```

### Error Handling

**Before:**
```typescript
// Mix of Express middleware errors and Effect errors
// Different error formats and handling
try {
  const result = await Effect.runPromise(effect);
  res.json(result);
} catch (error) {
  const errorResponse = transformError(error);
  res.status(errorResponse.status).json(errorResponse.body);
}
```

**After:**
```typescript
// Unified error handling through Effect error channel
// ParseError, AuthError, BusinessLogicError all handled consistently
// Error types flow through the pipeline type system
```

### Business Logic Separation

**Before:**
```typescript
export const getMember = (req: Request, res: Response) =>
  Effect.gen(function* () {
    // Coupled to Express Request/Response
    const id = yield* extractId(req);
    // Business logic mixed with HTTP concerns
  });
```

**After:**
```typescript
const getMemberById = Effect.gen(function* () {
  // Pure business logic, no HTTP dependencies
  const { id } = yield* useParsedParams<{ id: number }>();
  const memberService = yield* MemberService;
  return yield* memberService.getMemberById(id);
});
```

### Testing

**Before:**
```typescript
// Need to mock Express objects
const mockReq = { params: { id: '1' } } as Request;
const mockRes = { json: jest.fn() } as unknown as Response;
const result = await Effect.runPromise(getMember(mockReq, mockRes));
```

**After:**
```typescript
// Pure Effect testing
const result = await Effect.runPromise(
  getMemberById.pipe(
    Effect.provideService(ParsedParams, { id: 1 }),
    Effect.provide(TestMemberServiceLive)
  )
);
```

## Migration Path

### Phase 1: Infrastructure (✅ Complete)
- Context tags for request data
- Parser functions for body/query/params
- Auth pipeline functions
- Response formatters
- Enhanced expressAdapter

### Phase 2: Route-by-Route Migration
1. Convert schemas from Zod to Effect Schema
2. Replace middleware chain with pipeline
3. Extract business logic to pure functions
4. Update controller to use context accessors
5. Add proper response formatting

### Phase 3: Cleanup
- Remove old middleware once all routes migrated
- Deprecate legacy helpers like `extractId`
- Update documentation and examples

## Performance Considerations

- **Context overhead**: Minimal - Effect's context is optimized
- **Schema validation**: Effect Schema is comparable to Zod in performance
- **Pipeline composition**: No runtime overhead with proper TypeScript compilation
- **Memory usage**: Similar or better due to better garbage collection of immutable data

## Best Practices

1. **Keep business logic pure**: No Express dependencies in business functions
2. **Use schema validation**: Always validate inputs with Effect Schema
3. **Compose pipelines**: Build reusable pipeline segments
4. **Type everything**: Leverage TypeScript for compile-time safety
5. **Test pure functions**: Focus testing on business logic, not HTTP plumbing

## Conclusion

The Effect HTTP pipeline provides:
- ✅ **Better Type Safety** through schema validation and context flow
- ✅ **Improved Testability** with pure functions
- ✅ **Enhanced Composability** through functional pipeline approach
- ✅ **Unified Error Handling** through Effect error channel
- ✅ **Cleaner Architecture** with separation of concerns
- ✅ **Better Developer Experience** with compile-time guarantees