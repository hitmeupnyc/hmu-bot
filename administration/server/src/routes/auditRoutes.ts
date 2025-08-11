/**
 * Audit Routes
 * 
 * Defines all audit log related API endpoints.
 * Delegates business logic to AuditController.
 * Provides endpoints for retrieving audit logs with proper validation and middleware.
 */

import { Router } from 'express';
import * as AuditController from '../controllers/AuditController';
import { auditMiddlewares } from '../middleware/auditMiddlewareFactory';
import { validate } from '../middleware/validation';
import { auditQuerySchema, idParamSchema } from '../schemas/validation';
import { effectToExpress } from '../services/effect/adapters/expressAdapter';

const router = Router();

// Apply audit middleware for logging access to audit endpoints
router.use(auditMiddlewares.auditLog);

/**
 * Audit Log Endpoints
 * 
 * These endpoints provide access to system audit logs with proper filtering,
 * validation, and audit trail of who accessed what audit information.
 */

// GET /api/audit - Get audit log entries with filtering
router.get(
  '/',
  validate({ query: auditQuerySchema }),
  effectToExpress(AuditController.listAuditLogs)
);

// GET /api/audit/member/:id - Get audit log for specific member  
router.get(
  '/member/:id',
  validate({ params: idParamSchema }),
  effectToExpress(AuditController.getMemberAuditLogs)
);

export { router as auditRoutes };