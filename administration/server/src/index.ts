import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { DatabaseService } from './services/DatabaseService';
import jobScheduler from './services/JobScheduler';
import logger from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { memberRoutes } from './routes/memberRoutes';
import { eventRoutes } from './routes/eventRoutes';
import { webhookRoutes } from './routes/webhookRoutes';
import { klaviyoRoutes } from './routes/klaviyoRoutes';
import { eventbriteRoutes } from './routes/eventbriteRoutes';
import { patreonRoutes } from './routes/patreonRoutes';
import { discordRoutes } from './routes/discordRoutes';

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

// Initialize database
const dbService = DatabaseService.getInstance();
dbService.initialize();

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

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
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