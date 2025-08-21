import dotenv from 'dotenv';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import logger from './utils/logger';

import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiting';

import { applicationRoutes } from './routes/applicationRoutes';
import { auditRoutes } from './routes/auditRoutes';
import { authRoutes } from './routes/authRoutes';
import { eventRoutes } from './routes/eventRoutes';
import { healthCheckRouter } from './routes/healthCheck';
import { memberRoutes } from './routes/memberRoutes';

import { flagRoutes } from './routes/flagRoutes';

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

// Body parsing (exclude auth routes as Better Auth handles its own body parsing)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/auth/')) {
    return next();
  }
  express.json({ limit: '10mb' })(req, res, next);
});
app.use((req, res, next) => {
  if (req.path.startsWith('/api/auth/')) {
    return next();
  }
  express.urlencoded({ extended: true })(req, res, next);
});

// Rate limiting
app.use('/api', apiLimiter);

// Public routes (no auth required)
app.use('/health', healthCheckRouter);
app.use('/api/auth', authRoutes);

// Protected routes (require authentication)
app.use('/api/members', memberRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api', flagRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (_, res) => {
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
