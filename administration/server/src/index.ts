import dotenv from 'dotenv';

import cors from 'cors';
import express from 'express';
import * as fs from 'fs';
import helmet from 'helmet';
import morgan from 'morgan';
import * as os from 'os';
import * as path from 'path';
import { auditMiddleware as globalAuditMiddleware } from './middleware/auditLoggingMiddleware';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiting';
import { applicationRoutes } from './routes/applicationRoutes';
import { auditRoutes } from './routes/auditRoutes';
import { discordRoutes } from './routes/discordRoutes';
import { eventbriteRoutes } from './routes/eventbriteRoutes';
import { eventRoutes } from './routes/eventRoutes';
import { klaviyoRoutes } from './routes/klaviyoRoutes';
import { memberRoutes } from './routes/memberRoutes';
import { patreonRoutes } from './routes/patreonRoutes';
import { webhookRoutes } from './routes/webhookRoutes';
import { getDb, initialize } from './services/DatabaseService';
import { jobScheduler } from './services/JobScheduler';
import logger from './utils/logger';

// Load environment variables
dotenv.config();
console.log(process.env);

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

// Global audit middleware
app.use(globalAuditMiddleware);

// Initialize database
initialize();

// Initialize job scheduler
jobScheduler.processSyncJobs(parseInt(process.env.SYNC_WORKER_CONCURRENCY || '5'));
jobScheduler.processWebhookJobs(parseInt(process.env.WEBHOOK_WORKER_CONCURRENCY || '10'));

// Set up recurring sync jobs
if (process.env.NODE_ENV === 'production') {
  jobScheduler.scheduleBulkSyncs().catch((err) => {
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

// Health check with optional debug info
app.get('/health', async (req, res) => {
  try {
    // Check database connectivity
    const db = getDb();
    await db.selectFrom('payment_statuses').select('id').limit(1).execute();

    const basicHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      database: 'connected',
      environment: process.env.NODE_ENV || 'development',
    };

    // Check if debug information is requested
    const debugKey = req.headers['x-debug-key'];
    const expectedKey = process.env.DEBUG_KEY || 'debug-secret-key-2025';

    if (debugKey === expectedKey) {
      // Add comprehensive debug information
      const dbPath = process.env.DATABASE_PATH?.replace('file:', '') || 'data/development.db';
      const absoluteDbPath = path.resolve(dbPath);

      let dbStats: {
        size: number;
        sizeFormatted: string;
        modified: string;
        created: string;
      } | null = null;
      let dbSize = 'unknown';
      try {
        const stats = fs.statSync(absoluteDbPath);
        dbStats = {
          size: stats.size,
          sizeFormatted: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
          modified: stats.mtime.toISOString(),
          created: stats.birthtime.toISOString(),
        };
        dbSize = dbStats.sizeFormatted;
      } catch (error) {
        // Database file might not exist or be accessible
      }

      // Get database table counts
      let tableCounts: any = {};
      try {
        const memberResult = await db
          .selectFrom('members')
          .select(db.fn.count('id').as('count'))
          .executeTakeFirst();
        const eventResult = await db
          .selectFrom('events')
          .select(db.fn.count('id').as('count'))
          .executeTakeFirst();
        // Note: 'memberships' table exists in our schema
        const membershipResult = await db
          .selectFrom('memberships' as any)
          .select(db.fn.count('id').as('count'))
          .executeTakeFirst();

        tableCounts = {
          members: memberResult?.count || 0,
          events: eventResult?.count || 0,
          memberships: membershipResult?.count || 0,
        };
      } catch (error) {
        tableCounts = { error: 'Could not retrieve table counts' };
      }

      // Get git information
      let gitInfo = {};
      try {
        const gitHeadPath = path.resolve('.git/HEAD');
        if (fs.existsSync(gitHeadPath)) {
          const head = fs.readFileSync(gitHeadPath, 'utf8').trim();
          if (head.startsWith('ref: ')) {
            const refPath = head.substring(5);
            const commitPath = path.resolve('.git', refPath);
            if (fs.existsSync(commitPath)) {
              const commit = fs.readFileSync(commitPath, 'utf8').trim();
              gitInfo = {
                branch: refPath.replace('refs/heads/', ''),
                commit: commit.substring(0, 7),
                fullCommit: commit,
              };
            }
          }
        }
      } catch (error) {
        gitInfo = { error: 'Could not retrieve git information' };
      }

      const debugInfo = {
        ...basicHealth,
        debug: {
          application: {
            name: 'Club Management System',
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            port: process.env.PORT || 3000,
            uptime: `${Math.floor(process.uptime())} seconds`,
          },
          database: {
            type: 'SQLite',
            path: absoluteDbPath,
            exists: fs.existsSync(absoluteDbPath),
            stats: dbStats,
            size: dbSize,
            tableCounts,
          },
          system: {
            platform: os.platform(),
            arch: os.arch(),
            hostname: os.hostname(),
            release: os.release(),
            totalMemory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
            freeMemory: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
            cpus: os.cpus().length,
            loadAverage: os.loadavg(),
          },
          process: {
            pid: process.pid,
            version: process.version,
            nodeVersion: process.versions.node,
            platform: process.platform,
            arch: process.arch,
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime(),
            cwd: process.cwd(),
          },
          environment: {
            NODE_ENV: process.env.NODE_ENV,
            DATABASE_PATH: process.env.DATABASE_PATH ? '[CONFIGURED]' : '[NOT SET]',
            KLAVIYO_API_KEY: process.env.KLAVIYO_API_KEY ? '[CONFIGURED]' : '[NOT SET]',
            DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN ? '[CONFIGURED]' : '[NOT SET]',
            PATREON_CLIENT_ID: process.env.PATREON_CLIENT_ID ? '[CONFIGURED]' : '[NOT SET]',
            PORT: process.env.PORT || '[DEFAULT: 3000]',
          },
          git: gitInfo,
          network: Object.entries(os.networkInterfaces())
            .filter(([name]) => !name.startsWith('lo')) // Filter out loopback
            .map(([name, addresses]) => ({
              name,
              addresses:
                addresses?.filter((addr) => addr.family === 'IPv4').map((addr) => addr.address) ||
                [],
            })),
          time: {
            iso: new Date().toISOString(),
            unix: Math.floor(Date.now() / 1000),
            local: new Date().toString(),
            utc: new Date().toUTCString(),
          },
        },
      };

      return res.json(debugInfo);
    }

    return res.json(basicHealth);
  } catch (error) {
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
      database: 'disconnected',
    });
  }
});

// Environment check endpoint
app.get('/health/env', (req, res) => {
  const actualValues = ['DATABASE_PATH'];
  const requiredVars = ['JWT_SECRET'];
  const optionalVars = [
    'KLAVIYO_API_KEY',
    'DISCORD_BOT_TOKEN',
    'EVENTBRITE_API_TOKEN',
    'PATREON_CLIENT_ID',
  ];

  const env = {
    values: {} as Record<string, any>,
    required: {} as Record<string, boolean>,
    optional: {} as Record<string, boolean>,
    issues: [] as string[],
  };

  actualValues.forEach((varName) => {
    const exists = process.env[varName];
    env.values[varName] = exists;
    if (!exists) {
      env.issues.push(`Missing required environment variable: ${varName}`);
    }
  });
  requiredVars.forEach((varName) => {
    const exists = !!process.env[varName];
    env.required[varName] = exists;
    if (!exists) {
      env.issues.push(`Missing required environment variable: ${varName}`);
    }
  });

  optionalVars.forEach((varName) => {
    env.optional[varName] = !!process.env[varName];
  });

  const hasIssues = env.issues.length > 0;
  res.status(hasIssues ? 422 : 200).json({
    status: hasIssues ? 'configuration_issues' : 'ok',
    timestamp: new Date().toISOString(),
    environment: env,
  });
});

// Queue status endpoint
app.get('/api/queue/status', async (req, res) => {
  try {
    const stats = await jobScheduler.getQueueStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
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

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');

  server.close(async () => {
    try {
      await jobScheduler.shutdown();
      logger.info('Server shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  });
});
