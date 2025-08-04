import { Effect, Schedule, Queue, Ref, pipe } from 'effect';
import * as Schema from 'effect/Schema';
import { DatabaseService } from './context/DatabaseService';
import * as PatreonSyncEffects from './PatreonSyncEffects';
import * as DiscordSyncEffects from './DiscordSyncEffects';
import * as KlaviyoSyncEffects from './KlaviyoSyncEffects';
import * as EventbriteSyncEffects from './EventbriteSyncEffects';
import * as BaseSyncEffects from './BaseSyncEffects';
import { logSyncOperation } from '../../utils/logger';

// Job schemas
export const SyncJobDataSchema = Schema.Struct({
  platform: Schema.String,
  operationType: Schema.Literal('webhook', 'bulk_sync', 'manual_sync'),
  externalId: Schema.optional(Schema.String),
  payload: Schema.Unknown,
  retryCount: Schema.optionalWith(Schema.Number, { default: () => 0 }),
  metadata: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), { default: () => ({}) }),
});

export type SyncJobData = typeof SyncJobDataSchema.Type;

export const WebhookJobDataSchema = Schema.Struct({
  platform: Schema.String,
  eventType: Schema.String,
  payload: Schema.Unknown,
  signature: Schema.optional(Schema.String),
  timestamp: Schema.optionalWith(Schema.String, { default: () => new Date().toISOString() }),
});

export type WebhookJobData = typeof WebhookJobDataSchema.Type;

// Job result schema
const JobResultSchema = Schema.Struct({
  success: Schema.Boolean,
  memberId: Schema.optional(Schema.Number),
  error: Schema.optional(Schema.String),
  processingTime: Schema.Number,
});

export type JobResult = typeof JobResultSchema.Type;

// Error types
export class JobSchedulerError {
  readonly _tag = 'JobSchedulerError';
  constructor(readonly message: string, readonly platform?: string, readonly operationType?: string) {}
}

export class UnknownPlatformError {
  readonly _tag = 'UnknownPlatformError';
  constructor(readonly platform: string) {}
}

// Job state tracking
interface JobState {
  syncQueue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
  webhookQueue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
}

// Create initial job state
const createInitialJobState = (): JobState => ({
  syncQueue: { waiting: 0, active: 0, completed: 0, failed: 0 },
  webhookQueue: { waiting: 0, active: 0, completed: 0, failed: 0 },
});

// Job processor for sync operations
const processSyncJob = (job: SyncJobData) =>
  Effect.gen(function* () {
    const startTime = Date.now();
    const { platform, operationType, externalId, payload } = job;

    // Log job start
    logSyncOperation.started(platform, operationType, externalId);

    const result = yield* pipe(
      executeSyncOperation(platform, operationType, payload, externalId),
      Effect.catchAll((error) => {
        const processingTime = Date.now() - startTime;
        logSyncOperation.failed(
          platform,
          operationType,
          error as Error,
          externalId,
          { processingTime }
        );
        
        if (error instanceof UnknownPlatformError) {
          return Effect.succeed({
            success: false,
            error: `Unknown platform: ${error.platform}`,
            processingTime,
          });
        }
        return Effect.succeed({
          success: false,
          error: String(error),
          processingTime,
        });
      })
    );
    
    // Check if it's an error result
    if (typeof result === 'object' && result && 'success' in result && !result.success) {
      return result as JobResult;
    }
    
    // Log success
    const processingTime = Date.now() - startTime;
    logSyncOperation.success(
      platform,
      operationType,
      externalId,
      typeof result === 'object' && result && 'id' in result ? (result as any).id : undefined,
      { processingTime }
    );

    return {
      success: true,
      memberId: typeof result === 'object' && result && 'id' in result ? (result as any).id : undefined,
      processingTime,
    };
  });

// Job processor for webhook operations
const processWebhookJob = (job: WebhookJobData) =>
  Effect.gen(function* () {
    const startTime = Date.now();
    const { platform, eventType, payload, signature } = job;

    // Log webhook processing start
    logSyncOperation.started(platform, 'webhook_processing', undefined);

    const result = yield* pipe(
      executeWebhookProcessing(platform, eventType, payload, signature),
      Effect.catchAll((error) => {
        const processingTime = Date.now() - startTime;
        logSyncOperation.failed(
          platform,
          'webhook_processing',
          error as Error,
          undefined,
          { eventType, processingTime }
        );

        return Effect.succeed({
          success: false,
          error: String(error),
          processingTime,
        });
      })
    );
    
    // Check if it's an error result
    if (typeof result === 'object' && result && 'success' in result && !result.success) {
      return result as JobResult;
    }
    
    const processingTime = Date.now() - startTime;
    logSyncOperation.success(
      platform,
      'webhook_processing',
      undefined,
      undefined,
      { eventType, processingTime }
    );

    return {
      success: true,
      processingTime,
    };
  });

// Execute sync operation based on platform
const executeSyncOperation = (platform: string, operationType: string, payload: any, externalId?: string) =>
  Effect.gen(function* () {
    switch (platform) {
      case 'klaviyo':
        // Create a sync operation first
        const klaviyoSyncOp = yield* BaseSyncEffects.createSyncOperation({
          platform: 'klaviyo',
          operation_type: operationType,
          external_id: externalId || '',
          status: 'pending',
          payload_json: JSON.stringify(payload),
        });
        return yield* KlaviyoSyncEffects.syncKlaviyoProfile({
          id: externalId || '',
          email: payload.email || '',
          first_name: payload.first_name,
          last_name: payload.last_name,
          properties: payload.properties || {},
        }, klaviyoSyncOp.id!);

      case 'patreon':
        // Use PatreonSyncEffects bulkSync
        if (operationType === 'bulk_sync' && payload.campaignId) {
          return yield* PatreonSyncEffects.bulkSyncPatreons(payload.campaignId);
        }
        // For individual sync, create sync operation and process patron
        const patreonSyncOp = yield* BaseSyncEffects.createSyncOperation({
          platform: 'patreon',
          operation_type: operationType,
          external_id: externalId || '',
          status: 'pending',
          payload_json: JSON.stringify(payload),
        });
        return yield* PatreonSyncEffects.syncPatron(
          payload, // payload should be PatreonUser object
          [], // included array
          patreonSyncOp.id!
        );

      case 'discord':
        // Discord requires guild ID
        const guildId = payload.guildId || process.env.DISCORD_GUILD_ID || '';
        return yield* DiscordSyncEffects.bulkSyncDiscordMembers(guildId);

      case 'eventbrite':
        // Use EventbriteSyncEffects bulkSync
        if (operationType === 'bulk_sync' && payload.organizationId) {
          return yield* EventbriteSyncEffects.bulkSyncEvents(payload.organizationId);
        }
        // For individual sync, process the attendee data
        return yield* EventbriteSyncEffects.syncAttendee(payload, externalId || '');

      default:
        return yield* Effect.fail(new UnknownPlatformError(platform));
    }
  });

// Execute webhook processing based on platform
const executeWebhookProcessing = (platform: string, eventType: string, payload: any, signature?: string) =>
  Effect.gen(function* () {
    switch (platform) {
      case 'klaviyo':
        // Create sync operation for webhook
        const klaviyoWebhookSyncOp = yield* BaseSyncEffects.createSyncOperation({
          platform: 'klaviyo',
          operation_type: 'webhook',
          external_id: payload.id || '',
          status: 'pending',
          payload_json: JSON.stringify(payload),
        });
        return yield* KlaviyoSyncEffects.syncKlaviyoProfile(payload, klaviyoWebhookSyncOp.id!);

      case 'patreon':
        // Process Patreon webhook with signature verification
        if (!signature) {
          return yield* Effect.fail(new Error('Patreon webhook requires signature'));
        }
        return yield* PatreonSyncEffects.handlePatreonWebhook(payload, signature);

      case 'eventbrite':
        // Process Eventbrite webhook
        return yield* EventbriteSyncEffects.handleWebhook(payload);

      default:
        return yield* Effect.fail(new UnknownPlatformError(platform));
    }
  });

// Queue a sync job
export const queueSync = (data: SyncJobData) =>
  Effect.gen(function* () {
    const validatedData = yield* Schema.decodeUnknown(SyncJobDataSchema)(data);
    
    // In a real implementation, this would add to a queue
    // For now, we'll process immediately
    const result = yield* processSyncJob(validatedData);
    
    return {
      jobId: `sync-${Date.now()}`,
      status: result.success ? 'completed' : 'failed',
      result,
    };
  });

// Queue a webhook job
export const queueWebhook = (data: WebhookJobData) =>
  Effect.gen(function* () {
    const validatedData = yield* Schema.decodeUnknown(WebhookJobDataSchema)(data);
    
    // Process immediately for now
    const result = yield* processWebhookJob(validatedData);
    
    return {
      jobId: `webhook-${Date.now()}`,
      status: result.success ? 'completed' : 'failed',
      result,
    };
  });

// Queue a bulk sync
export const queueBulkSync = (platform: string, config?: any) =>
  queueSync({
    platform,
    operationType: 'bulk_sync',
    payload: config || {},
    retryCount: 0,
    metadata: { scheduledAt: new Date().toISOString() },
  });

// Schedule recurring bulk syncs using Effect.Schedule
export const scheduleBulkSyncs = () =>
  Effect.gen(function* () {
    const schedules = [
      { platform: 'klaviyo', interval: '6 hours', cronExpression: '0 */6 * * *' },
      { platform: 'eventbrite', interval: '2 hours', cronExpression: '0 */2 * * *' },
      { platform: 'patreon', interval: '12 hours', cronExpression: '0 */12 * * *' },
      { platform: 'discord', interval: '24 hours', cronExpression: '0 0 * * *' },
    ];

    // Create scheduled tasks for each platform
    const tasks = schedules.map(({ platform, interval, cronExpression }) => {
      const schedule = interval === '2 hours'
        ? Schedule.fixed('2 hours')
        : interval === '6 hours'
        ? Schedule.fixed('6 hours')
        : interval === '12 hours'
        ? Schedule.fixed('12 hours')
        : Schedule.fixed('24 hours');

      return pipe(
        queueBulkSync(platform, { 
          recurring: true, 
          cronExpression,
          scheduledAt: new Date().toISOString() 
        }),
        Effect.retry(Schedule.exponential('1 seconds', 2.0).pipe(Schedule.intersect(Schedule.recurs(3)))),
        Effect.repeat(schedule),
        Effect.catchAll((error) => 
          Effect.logError(`Failed to schedule ${platform} sync: ${String(error)}`)
        ),
        Effect.fork // Run in background
      );
    });

    // Start all scheduled tasks
    const fibers = yield* Effect.all(tasks);
    
    return { 
      message: 'Bulk sync schedules started',
      platforms: schedules.map(s => ({ platform: s.platform, interval: s.interval })),
      fibers: fibers.length,
      startedAt: new Date().toISOString(),
    };
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* Effect.logError(`Failed to start bulk sync schedules: ${String(error)}`);
        return {
          message: 'Failed to start some bulk sync schedules',
          error: String(error),
          timestamp: new Date().toISOString(),
        };
      })
    )
  );

// Get job statistics
export const getJobStats = () =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    
    // Get sync operation statistics from database
    const syncStats = yield* db.query(async (db) => {
      const results = await db
        .selectFrom('sync_operations')
        .select([
          db.fn.count('id').as('total'),
          db.fn.countAll().filterWhere('status', '=', 'pending').as('pending'),
          db.fn.countAll().filterWhere('status', '=', 'processing').as('active'),
          db.fn.countAll().filterWhere('status', '=', 'success').as('completed'),
          db.fn.countAll().filterWhere('status', '=', 'failed').as('failed'),
        ])
        .where('created_at', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .executeTakeFirst();
      
      return {
        waiting: Number(results?.pending || 0),
        active: Number(results?.active || 0),
        completed: Number(results?.completed || 0),
        failed: Number(results?.failed || 0),
        total: Number(results?.total || 0),
      };
    });

    return {
      sync: syncStats,
      webhook: {
        // Webhook stats are included in sync stats since they create sync_operations
        waiting: 0,
        active: 0,
        completed: syncStats.completed,
        failed: syncStats.failed,
        total: syncStats.total,
      },
      timestamp: new Date().toISOString(),
      period: 'last_24_hours',
    };
  });

// Initialize job processing workers
export const initializeJobProcessors = (syncConcurrency: number = 5, webhookConcurrency: number = 10) =>
  Effect.gen(function* () {
    // Start background workers for processing jobs
    // In a production system, these would process from persistent queues
    
    // For now, we just track that workers are initialized
    return {
      sync: {
        concurrency: syncConcurrency,
        status: 'initialized',
      },
      webhook: {
        concurrency: webhookConcurrency,
        status: 'initialized',
      },
    };
  });

// Process sync jobs with concurrency control (simplified for non-Bull implementation)
export const processSyncJobs = (concurrency: number = 5) =>
  Effect.succeed({
    message: `Sync job processor initialized with concurrency: ${concurrency}`,
    concurrency,
    status: 'ready',
  });

// Process webhook jobs with concurrency control (simplified for non-Bull implementation)
export const processWebhookJobs = (concurrency: number = 10) =>
  Effect.succeed({
    message: `Webhook job processor initialized with concurrency: ${concurrency}`,
    concurrency,
    status: 'ready',
  });

// Shutdown job processors gracefully
export const shutdown = () =>
  Effect.gen(function* () {
    // In a real implementation, this would:
    // 1. Stop accepting new jobs
    // 2. Wait for running jobs to complete
    // 3. Clean up resources
    
    return {
      message: 'Job scheduler shutdown complete',
      timestamp: new Date().toISOString(),
    };
  });