import winston from 'winston';

// Define log levels and colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

winston.addColors(logColors);

// Create logger instance
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'club-management',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// Sync operation logging helpers
export const logSyncOperation = {
  started: (platform: string, operationType: string, externalId?: string) => {
    logger.info('Sync operation started', {
      platform,
      operationType,
      externalId,
      stage: 'started',
    });
  },

  success: (platform: string, operationType: string, externalId?: string, memberId?: number, details?: any) => {
    logger.info('Sync operation completed successfully', {
      platform,
      operationType,
      externalId,
      memberId,
      stage: 'completed',
      ...details,
    });
  },

  failed: (platform: string, operationType: string, error: Error, externalId?: string, details?: any) => {
    logger.error('Sync operation failed', {
      platform,
      operationType,
      externalId,
      error: error.message,
      errorStack: error.stack,
      stage: 'failed',
      ...details,
    });
  },

  retrying: (platform: string, operationType: string, attempt: number, maxAttempts: number, externalId?: string) => {
    logger.warn('Sync operation retrying', {
      platform,
      operationType,
      externalId,
      attempt,
      maxAttempts,
      stage: 'retrying',
    });
  },
};

// Webhook logging helpers
export const logWebhook = {
  received: (platform: string, eventType: string, payload?: any) => {
    logger.info('Webhook received', {
      platform,
      eventType,
      payloadSize: JSON.stringify(payload).length,
      stage: 'received',
    });
  },

  verified: (platform: string, eventType: string) => {
    logger.debug('Webhook signature verified', {
      platform,
      eventType,
      stage: 'verified',
    });
  },

  verificationFailed: (platform: string, reason: string) => {
    logger.warn('Webhook signature verification failed', {
      platform,
      reason,
      stage: 'verification_failed',
    });
  },

  processed: (platform: string, eventType: string, result: any) => {
    logger.info('Webhook processed', {
      platform,
      eventType,
      result,
      stage: 'processed',
    });
  },
};

// API integration logging helpers
export const logApiCall = {
  started: (platform: string, endpoint: string, method: string = 'GET') => {
    logger.debug('API call started', {
      platform,
      endpoint,
      method,
      stage: 'api_call_started',
    });
  },

  success: (platform: string, endpoint: string, responseSize?: number, duration?: number) => {
    logger.debug('API call successful', {
      platform,
      endpoint,
      responseSize,
      duration,
      stage: 'api_call_success',
    });
  },

  failed: (platform: string, endpoint: string, error: Error, statusCode?: number) => {
    logger.error('API call failed', {
      platform,
      endpoint,
      error: error.message,
      statusCode,
      stage: 'api_call_failed',
    });
  },

  rateLimited: (platform: string, endpoint: string, retryAfter?: number) => {
    logger.warn('API call rate limited', {
      platform,
      endpoint,
      retryAfter,
      stage: 'api_rate_limited',
    });
  },
};

// Connection logging helpers
export const logConnection = {
  established: (service: string, details?: any) => {
    logger.info('Service connection established', {
      service,
      stage: 'connected',
      ...details,
    });
  },

  lost: (service: string, reason?: string) => {
    logger.error('Service connection lost', {
      service,
      reason,
      stage: 'disconnected',
    });
  },

  reconnecting: (service: string, attempt: number) => {
    logger.info('Service reconnecting', {
      service,
      attempt,
      stage: 'reconnecting',
    });
  },
};

export default logger;