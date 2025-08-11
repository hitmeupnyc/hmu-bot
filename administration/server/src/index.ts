import dotenv from 'dotenv';

import cors from 'cors';
import { Effect } from 'effect';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiting';
import { applicationRoutes } from './routes/applicationRoutes';
import { auditRoutes } from './routes/auditRoutes';
import { discordRoutes } from './routes/discordRoutes';
import { eventbriteRoutes } from './routes/eventbriteRoutes';
import { eventRoutes } from './routes/eventRoutes';
import { healthCheckRouter } from './routes/healthCheck';
import { klaviyoRoutes } from './routes/klaviyoRoutes';
import { memberRoutes } from './routes/memberRoutes';
import { patreonRoutes } from './routes/patreonRoutes';
import { webhookRoutes } from './routes/webhookRoutes';
import * as JobSchedulerEffects from './services/effect/JobSchedulerEffects';
import { DatabaseLive } from './services/effect/layers/DatabaseLayer';
import logger from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api', apiLimiter);

// Initialize job scheduler (Effect-based)
const initializeJobScheduler = async () => {
  try {
    // Initialize job processors
    const syncResult = await Effect.runPromise(
      JobSchedulerEffects.processSyncJobs(
        parseInt(process.env.SYNC_WORKER_CONCURRENCY || '5')
      ).pipe(Effect.provide(DatabaseLive))
    );
    logger.info('Sync job processor initialized', syncResult);

    const webhookResult = await Effect.runPromise(
      JobSchedulerEffects.processWebhookJobs(
        parseInt(process.env.WEBHOOK_WORKER_CONCURRENCY || '10')
      ).pipe(Effect.provide(DatabaseLive))
    );
    logger.info('Webhook job processor initialized', webhookResult);

    // Set up recurring sync jobs in production
    if (process.env.NODE_ENV === 'production') {
      const scheduleResult = await Effect.runPromise(
        JobSchedulerEffects.scheduleBulkSyncs().pipe(
          Effect.provide(DatabaseLive)
        )
      );
      logger.info('Bulk sync schedules started', scheduleResult);
    }
  } catch (error) {
    logger.error('Failed to initialize job scheduler', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Initialize the job scheduler
initializeJobScheduler();

// Routes
app.use('/health', healthCheckRouter);
app.use('/api/members', memberRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/klaviyo', klaviyoRoutes);
app.use('/api/eventbrite', eventbriteRoutes);
app.use('/api/patreon', patreonRoutes);
app.use('/api/discord', discordRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/audit', auditRoutes);

// Queue status endpoint (Effect-based)
app.get('/api/queue/status', async (req, res) => {
  try {
    const stats = await Effect.runPromise(
      JobSchedulerEffects.getJobStats().pipe(Effect.provide(DatabaseLive))
    );
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to fetch queue stats', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch queue stats',
    });
  }
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const server = app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV,
    healthCheck: `http://localhost:${PORT}/health`,
  });
});

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);

  server.close(async () => {
    try {
      // Shutdown job scheduler (Effect-based)
      const shutdownResult = await Effect.runPromise(
        JobSchedulerEffects.shutdown().pipe(Effect.provide(DatabaseLive))
      );
      logger.info('Job scheduler shutdown complete', shutdownResult);

      logger.info('Server shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  });
};

// Graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
