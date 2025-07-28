import Bull from 'bull';
import { logSyncOperation } from '../utils/logger';

// Job types for different sync operations
export interface SyncJobData {
  platform: string;
  operationType: 'webhook' | 'bulk_sync' | 'manual_sync';
  externalId?: string;
  payload: any;
  retryCount?: number;
  metadata?: Record<string, any>;
}

export interface WebhookJobData {
  platform: string;
  eventType: string;
  payload: any;
  signature?: string;
  timestamp?: string;
}

class JobSchedulerService {
  private syncQueue: Bull.Queue<SyncJobData>;
  private webhookQueue: Bull.Queue<WebhookJobData>;

  constructor() {
    const redisConfig = {
      redis: {
        port: parseInt(process.env.REDIS_PORT || '6379'),
        host: process.env.REDIS_HOST || 'localhost',
        password: process.env.REDIS_PASSWORD,
      },
    };

    // Initialize queues
    this.syncQueue = new Bull('sync-operations', {
      ...redisConfig,
      defaultJobOptions: {
        attempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3'),
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
      },
    });

    this.webhookQueue = new Bull('webhook-processing', {
      ...redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 200,
        removeOnFail: 100,
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Sync queue event handlers
    this.syncQueue.on('completed', (job, result) => {
      logSyncOperation.success(
        job.data.platform,
        job.data.operationType,
        job.data.externalId,
        result?.memberId,
        { jobId: job.id, processingTime: Date.now() - job.timestamp }
      );
    });

    this.syncQueue.on('failed', (job, err) => {
      logSyncOperation.failed(
        job.data.platform,
        job.data.operationType,
        err,
        job.data.externalId,
        { jobId: job.id, attemptsMade: job.attemptsMade }
      );
    });

    this.syncQueue.on('stalled', (job) => {
      logSyncOperation.retrying(
        job.data.platform,
        job.data.operationType,
        job.attemptsMade + 1,
        job.opts.attempts || 3,
        job.data.externalId
      );
    });

    // Webhook queue event handlers
    this.webhookQueue.on('completed', (job, result) => {
      logSyncOperation.success(
        job.data.platform,
        'webhook_processing',
        undefined,
        undefined,
        { 
          jobId: job.id, 
          eventType: job.data.eventType,
          processingTime: Date.now() - job.timestamp 
        }
      );
    });

    this.webhookQueue.on('failed', (job, err) => {
      logSyncOperation.failed(
        job.data.platform,
        'webhook_processing',
        err,
        undefined,
        { 
          jobId: job.id, 
          eventType: job.data.eventType,
          attemptsMade: job.attemptsMade 
        }
      );
    });
  }

  // Queue a sync operation
  async queueSync(data: SyncJobData, options?: Bull.JobOptions): Promise<Bull.Job<SyncJobData>> {
    logSyncOperation.started(data.platform, data.operationType, data.externalId);
    
    return this.syncQueue.add('process-sync', data, {
      priority: this.getSyncPriority(data),
      delay: this.getSyncDelay(data),
      ...options,
    });
  }

  // Queue a webhook for processing
  async queueWebhook(data: WebhookJobData, options?: Bull.JobOptions): Promise<Bull.Job<WebhookJobData>> {
    return this.webhookQueue.add('process-webhook', data, {
      priority: this.getWebhookPriority(data),
      ...options,
    });
  }

  // Queue a bulk sync operation
  async queueBulkSync(platform: string, config?: any): Promise<Bull.Job<SyncJobData>> {
    return this.queueSync({
      platform,
      operationType: 'bulk_sync',
      payload: config || {},
      metadata: { scheduledAt: new Date().toISOString() },
    });
  }

  // Set up recurring bulk sync jobs
  async scheduleBulkSyncs() {
    const schedules = [
      { platform: 'klaviyo', cron: '0 */6 * * *' }, // Every 6 hours
      { platform: 'eventbrite', cron: '0 */2 * * *' }, // Every 2 hours
      { platform: 'patreon', cron: '0 */12 * * *' }, // Every 12 hours
      { platform: 'discord', cron: '0 */24 * * *' }, // Daily
    ];

    for (const schedule of schedules) {
      await this.syncQueue.add(
        `bulk-sync-${schedule.platform}`,
        {
          platform: schedule.platform,
          operationType: 'bulk_sync',
          payload: {},
          metadata: { recurring: true },
        },
        {
          repeat: { cron: schedule.cron },
          removeOnComplete: 5,
          removeOnFail: 2,
        }
      );
    }
  }

  // Process sync jobs
  processSyncJobs(concurrency: number = 5) {
    this.syncQueue.process('process-sync', concurrency, async (job) => {
      const { platform, operationType, externalId, payload } = job.data;
      
      try {
        // Dynamic import to avoid circular dependencies
        const result = await this.executeSyncOperation(platform, operationType, payload, externalId);
        return result;
      } catch (error) {
        // Let Bull handle retries
        throw error;
      }
    });
  }

  // Process webhook jobs
  processWebhookJobs(concurrency: number = 10) {
    this.webhookQueue.process('process-webhook', concurrency, async (job) => {
      const { platform, eventType, payload, signature } = job.data;
      
      try {
        const result = await this.executeWebhookProcessing(platform, eventType, payload, signature);
        return result;
      } catch (error) {
        throw error;
      }
    });
  }

  private async executeSyncOperation(platform: string, operationType: string, payload: any, externalId?: string) {
    // Import services dynamically to avoid circular dependencies
    switch (platform) {
      case 'klaviyo': {
        const { KlaviyoSyncService } = await import('./KlaviyoSyncService');
        const service = new KlaviyoSyncService();
        return await service.bulkSync();
      }
      case 'eventbrite': {
        const { EventbriteSyncService } = await import('./EventbriteSyncService');
        const service = new EventbriteSyncService();
        return await service.bulkSync(payload.organizationId);
      }
      case 'patreon': {
        const { PatreonSyncService } = await import('./PatreonSyncService');
        const service = new PatreonSyncService();
        return await service.bulkSync(payload.campaignId);
      }
      case 'discord': {
        const { DiscordSyncService } = await import('./DiscordSyncService');
        const service = new DiscordSyncService();
        await service.initialize();
        return await service.bulkSync();
      }
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }
  }

  private async executeWebhookProcessing(platform: string, eventType: string, payload: any, signature?: string) {
    // Import and execute webhook handlers
    switch (platform) {
      case 'klaviyo': {
        const { KlaviyoSyncService } = await import('./KlaviyoSyncService');
        const service = new KlaviyoSyncService();
        return await service.handleWebhook(payload);
      }
      case 'eventbrite': {
        const { EventbriteSyncService } = await import('./EventbriteSyncService');
        const service = new EventbriteSyncService();
        return await service.handleWebhook(payload);
      }
      case 'patreon': {
        const { PatreonSyncService } = await import('./PatreonSyncService');
        const service = new PatreonSyncService();
        return await service.handleWebhook(payload, signature || '');
      }
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }
  }

  private getSyncPriority(data: SyncJobData): number {
    // Higher priority for webhook-triggered syncs
    if (data.operationType === 'webhook') return 10;
    if (data.operationType === 'manual_sync') return 5;
    return 1; // bulk_sync gets lowest priority
  }

  private getSyncDelay(data: SyncJobData): number {
    // Add small delays to spread out bulk operations
    if (data.operationType === 'bulk_sync') {
      return Math.random() * 30000; // 0-30 seconds
    }
    return 0;
  }

  private getWebhookPriority(data: WebhookJobData): number {
    // All webhooks get high priority
    return 10;
  }

  // Utility methods for monitoring
  async getQueueStats() {
    const [syncStats, webhookStats] = await Promise.all([
      {
        waiting: await this.syncQueue.getWaiting(),
        active: await this.syncQueue.getActive(),
        completed: await this.syncQueue.getCompleted(),
        failed: await this.syncQueue.getFailed(),
      },
      {
        waiting: await this.webhookQueue.getWaiting(),
        active: await this.webhookQueue.getActive(),
        completed: await this.webhookQueue.getCompleted(),
        failed: await this.webhookQueue.getFailed(),
      },
    ]);

    return {
      sync: {
        waiting: syncStats.waiting.length,
        active: syncStats.active.length,
        completed: syncStats.completed.length,
        failed: syncStats.failed.length,
      },
      webhook: {
        waiting: webhookStats.waiting.length,
        active: webhookStats.active.length,
        completed: webhookStats.completed.length,
        failed: webhookStats.failed.length,
      },
    };
  }

  async shutdown() {
    await Promise.all([
      this.syncQueue.close(),
      this.webhookQueue.close(),
    ]);
  }
}

// Export singleton instance
export const jobScheduler = new JobSchedulerService();
export default jobScheduler;