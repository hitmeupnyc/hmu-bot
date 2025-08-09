# Effect-TS Migration Plan

## Current State Analysis

### Already Migrated to Effect
- ✅ MemberEffects
- ✅ EventEffects
- ✅ AuditEffects
- ✅ DiscordSyncEffects
- ✅ EventbriteSyncEffects
- ✅ KlaviyoSyncEffects
- ✅ PatreonSyncEffects
- ✅ BaseSyncEffects
- ✅ JobSchedulerEffects

### Broken Imports in Routes
Based on `npm run typecheck` errors:
1. `auditLoggingMiddleware.ts` - importing non-existent `AuditService` and `MemberService`
2. `auditRoutes.ts` - importing non-existent `AuditService`
3. `eventbriteRoutes.ts` - importing non-existent `EventbriteSyncService`
4. `klaviyoRoutes.ts` - importing non-existent `KlaviyoSyncService` and `DatabaseService`
5. `memberRoutes.ts` - importing non-existent `AuditService`

### Remaining Non-Effect Service
- `WebhookService.ts` - Still exists in old format

## Migration Tasks

### 1. Fix Audit Routes & Middleware
- Replace `AuditService` imports with `AuditEffects` 
- Update `auditRoutes.ts` to use `effectToExpress` adapter
- Refactor `auditLoggingMiddleware.ts` to use Effect patterns

### 2. Fix Sync Routes
- Update `eventbriteRoutes.ts` to use `EventbriteSyncEffects`
- Update `klaviyoRoutes.ts` to use `KlaviyoSyncEffects`
- Both need conversion to `effectToExpress` pattern

### 3. Clean up Member Routes
- Remove `AuditService` import from `memberRoutes.ts`
- Ensure audit logging is handled through Effect composition

### 4. Migrate WebhookService
- Create `WebhookEffects.ts` following the Effect pattern
- Update `webhookRoutes.ts` to use the new Effect service

## Pattern for Route Migration

```typescript
// Old pattern
const service = new SomeService();
router.post('/endpoint', asyncHandler(async (req, res) => {
  const result = await service.someMethod(req.body);
  res.json({ success: true, data: result });
}));

// New Effect pattern
router.post('/endpoint', effectToExpress((req, res) =>
  Effect.gen(function* () {
    const body = yield* extractBody(req);
    const result = yield* SomeEffects.someMethod(body);
    return { success: true, data: result };
  })
));
```

## Key Considerations
- All Effects need to be provided with `DatabaseLive` layer (handled by `effectToExpress`)
- Error handling is automatic through Effect's error types
- Audit logging should be composed within Effects, not in middleware
- Webhook signature verification should remain as Express middleware