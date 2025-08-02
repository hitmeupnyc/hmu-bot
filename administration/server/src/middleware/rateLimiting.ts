import { Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Default rate limit configuration
const defaultLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000, // limit each IP to 100000 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  keyGenerator: (req: Request): string => {
    // Use IP address as the key, with fallback for proxied requests
    return ipKeyGenerator(req.ip || req.connection.remoteAddress || 'unknown');
  },
  skip: (req: Request): boolean => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/health/env';
  },
};

// General API rate limiter
export const apiLimiter = rateLimit({
  ...defaultLimitConfig,
  max: 100, // 100 requests per 15 minutes
});

// Lenient rate limiter for read-only operations
export const readOnlyLimiter = rateLimit({
  ...defaultLimitConfig,
  max: 200, // 200 requests per 15 minutes
  message: {
    success: false,
    error: 'Too many read requests, please try again later',
    code: 'READ_RATE_LIMIT_EXCEEDED',
  },
});
