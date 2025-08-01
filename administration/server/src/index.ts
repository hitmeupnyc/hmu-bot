import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { getDb, initialize } from './services/DatabaseService';
import { jobScheduler } from './services/JobScheduler';
import logger from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { auditMiddleware as globalAuditMiddleware } from './middleware/auditLoggingMiddleware';
import { memberRoutes } from './routes/memberRoutes';
import { eventRoutes } from './routes/eventRoutes';
import { webhookRoutes } from './routes/webhookRoutes';
import { klaviyoRoutes } from './routes/klaviyoRoutes';
import { eventbriteRoutes } from './routes/eventbriteRoutes';
import { patreonRoutes } from './routes/patreonRoutes';
import { discordRoutes } from './routes/discordRoutes';
import { applicationRoutes } from './routes/applicationRoutes';
import { auditRoutes } from './routes/auditRoutes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global audit middleware
app.use(globalAuditMiddleware);

// Initialize database
initialize();

// Initialize job scheduler
jobScheduler.processSyncJobs(parseInt(process.env.SYNC_WORKER_CONCURRENCY || '5'));
jobScheduler.processWebhookJobs(parseInt(process.env.WEBHOOK_WORKER_CONCURRENCY || '10'));

// Set up recurring sync jobs
if (process.env.NODE_ENV === 'production') {
  jobScheduler.scheduleBulkSyncs().catch(err => {
    logger.error('Failed to schedule bulk syncs', { error: err.message });
  });
}

// Routes
app.use('/api/members', memberRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/klaviyo', klaviyoRoutes);
app.use('/api/eventbrite', eventbriteRoutes);
app.use('/api/patreon', patreonRoutes);
app.use('/api/discord', discordRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/audit', auditRoutes);

// Health check
app.get('/health', async (req, res) => {
  try {
    // Check database connectivity
    const db = getDb();
    await db.selectFrom('payment_statuses').select('id').limit(1).execute();
    
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      database: 'connected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
      database: 'disconnected'
    });
  }
});

// Environment check endpoint
app.get('/health/env', (req, res) => {
  const requiredVars = ['DATABASE_PATH', 'JWT_SECRET'];
  const optionalVars = ['KLAVIYO_API_KEY', 'DISCORD_BOT_TOKEN', 'EVENTBRITE_API_TOKEN', 'PATREON_CLIENT_ID'];
  
  const env = {
    required: {} as Record<string, boolean>,
    optional: {} as Record<string, boolean>,
    issues: [] as string[]
  };
  
  requiredVars.forEach(varName => {
    const exists = !!process.env[varName];
    env.required[varName] = exists;
    if (!exists) {
      env.issues.push(`Missing required environment variable: ${varName}`);
    }
  });
  
  optionalVars.forEach(varName => {
    env.optional[varName] = !!process.env[varName];
  });
  
  const hasIssues = env.issues.length > 0;
  res.status(hasIssues ? 422 : 200).json({
    status: hasIssues ? 'configuration_issues' : 'ok',
    timestamp: new Date().toISOString(),
    environment: env
  });
});

// Queue status endpoint
app.get('/api/queue/status', async (req, res) => {
  try {
    const stats = await jobScheduler.getQueueStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch queue stats'
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
    healthCheck: `http://localhost:${PORT}/health`
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  server.close(async () => {
    try {
      await jobScheduler.shutdown();
      logger.info('Server shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error: error instanceof Error ? error.message : 'Unknown error' });
      process.exit(1);
    }
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  server.close(async () => {
    try {
      await jobScheduler.shutdown();
      logger.info('Server shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error: error instanceof Error ? error.message : 'Unknown error' });
      process.exit(1);
    }
  });
});
