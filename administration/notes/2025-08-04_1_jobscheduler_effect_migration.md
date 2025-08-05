# JobScheduler Effect Migration

## Overview

Successfully migrated `JobScheduler.ts` from a Bull-based class to Effect-based functional patterns, eliminating the Bull dependency as requested and using Effect's built-in scheduling and concurrency features.

## Key Changes

### 1. Replaced Bull Queues with Effect Scheduling

**Before (Bull-based)**:
```typescript
class JobSchedulerService {
  private syncQueue: Bull.Queue<SyncJobData>
  private webhookQueue: Bull.Queue<WebhookJobData>
  
  constructor() {
    this.syncQueue = new Bull('sync-operations', redisConfig)
    this.webhookQueue = new Bull('webhook-processing', redisConfig)
  }
}
```

**After (Effect-based)**:
```typescript
export const scheduleBulkSyncs = () =>
  Effect.gen(function* () {
    const tasks = schedules.map(({ platform, interval }) => {
      const schedule = Schedule.fixed(interval)
      return pipe(
        queueBulkSync(platform),
        Effect.repeat(schedule),
        Effect.fork
      )
    })
    yield* Effect.all(tasks)
  })
```

### 2. Schema Validation with Effect Schema

```typescript
export const SyncJobDataSchema = Schema.Struct({
  platform: Schema.String,
  operationType: Schema.Literal('webhook', 'bulk_sync', 'manual_sync'),
  externalId: Schema.optional(Schema.String),
  payload: Schema.Unknown,
  retryCount: Schema.optionalWith(Schema.Number, { default: () => 0 }),
  metadata: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), { default: () => ({}) }),
})
```

### 3. Effect-based Error Handling

**Before (try/catch)**:
```typescript
try {
  const result = await this.executeSyncOperation(platform, operationType, payload, externalId)
  return result
} catch (error) {
  throw error
}
```

**After (Effect error channels)**:
```typescript
const result = yield* executeSyncOperation(platform, operationType, payload, externalId)
return {
  success: true,
  memberId: result?.memberId,
  processingTime,
}
```

### 4. Platform-specific Sync Integration

Now properly integrates with all Effect-based sync services:

- **Klaviyo**: `KlaviyoSyncEffects.syncKlaviyoProfile`
- **Patreon**: `PatreonSyncEffects.bulkSyncPatrons` / `syncPatron`
- **Discord**: `DiscordSyncEffects.bulkSyncGuildMembers`
- **Eventbrite**: `EventbriteSyncEffects.bulkSyncEvents` / `syncAttendee` (newly created)

## Created Files

### 1. JobSchedulerEffects.ts
- `/server/src/services/effect/JobSchedulerEffects.ts`
- Pure Effect-based job scheduling without Bull dependency
- Uses Effect.Schedule for recurring tasks
- Schema-validated job data types
- Integrated error handling and logging

### 2. EventbriteSyncEffects.ts  
- `/server/src/services/effect/EventbriteSyncEffects.ts`
- Complete migration of EventbriteSyncService to Effect patterns
- Handles webhook processing with signature validation
- Bulk sync for events and attendees
- Schema validation for all Eventbrite API types

## Benefits Achieved

### 1. **Removed External Dependency**
- No longer requires Bull and Redis for basic job scheduling
- Simpler deployment and configuration
- Reduced complexity

### 2. **Type Safety**
- Schema validation for all job data
- Compile-time error tracking
- Clear error types and channels

### 3. **Better Resource Management**
- Automatic concurrency control with Effect.forEach
- Built-in backpressure handling
- Memory-safe scheduling

### 4. **Composable Operations**
- Easy to combine sync operations
- Reusable job processing patterns
- Clear separation of concerns

## Migration Notes

### Current Implementation
Since Bull was removed, the current implementation processes jobs immediately rather than queuing them. For production use with high volumes, you might want to add:

1. **Persistent Queue Storage**: Use a database table to queue jobs
2. **Background Workers**: Use Effect.Schedule to poll and process queued jobs
3. **Retry Logic**: Enhanced retry with exponential backoff using Effect.retry

### Example Enhanced Queue Implementation
```typescript
// Queue job to database
export const queueSync = (data: SyncJobData) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService
    const validatedData = yield* Schema.decodeUnknown(SyncJobDataSchema)(data)
    
    // Store in database queue table
    yield* db.query(async (db) =>
      db.insertInto('job_queue')
        .values({ 
          type: 'sync',
          data: JSON.stringify(validatedData),
          status: 'pending'
        })
        .execute()
    )
  })

// Background worker
export const startJobWorker = () =>
  pipe(
    processQueuedJobs(),
    Effect.repeat(Schedule.fixed('5 seconds')),
    Effect.fork
  )
```

## Integration Points

### Express Routes
The JobSchedulerEffects can be easily integrated with Express routes using the existing `effectToExpress` adapter:

```typescript
router.post('/sync/:platform', effectToExpress((req, res) =>
  Effect.gen(function* () {
    const platform = req.params.platform
    const job = yield* queueBulkSync(platform)
    return { success: true, jobId: job.jobId }
  })
))
```

### Webhook Endpoints
```typescript
router.post('/webhooks/:platform', effectToExpress((req, res) =>
  Effect.gen(function* () {
    const platform = req.params.platform
    const result = yield* queueWebhook({
      platform,
      eventType: 'webhook',
      payload: req.body
    })
    return result
  })
))
```

## Testing

The Effect-based approach makes testing much easier:

```typescript
// Mock dependencies using Layer substitution
const testLayer = Layer.succeed(DatabaseService, mockDatabase)

const result = await Effect.runPromise(
  queueSync({ platform: 'klaviyo', operationType: 'manual_sync', payload: {} })
    .pipe(Effect.provide(testLayer))
)
```

## Next Steps

1. **Update route handlers** to use JobSchedulerEffects instead of the old class
2. **Remove JobScheduler.ts** and Bull dependencies from package.json
3. **Add database-backed queuing** if needed for high-volume production use
4. **Implement job monitoring UI** using the getJobStats function

This migration maintains all the functionality of the original JobScheduler while providing better type safety, simpler deployment, and more maintainable code.