/**
 * Audit Routes
 *
 * Defines all audit log related API endpoints.
 * Delegates business logic to AuditController.
 * Provides endpoints for retrieving audit logs with proper validation and middleware.
 */

import { Router } from 'express';
import * as AuditController from '../controllers/AuditController';
import {
  requireAdmin,
  requireAuth,
  requirePermission,
} from '../middleware/auth';
import { validate } from '../middleware/validation';
import { auditBodySchema, auditQuerySchema } from '../schemas/validation';
import { effectToExpress } from '../services/effect/adapters/expressAdapter';

const router = Router();

/**
 * Audit Log Endpoints
 *
 * These endpoints provide access to system audit logs with proper filtering,
 * validation, and audit trail of who accessed what audit information.
 */

// GET /api/audit - Get audit log entries with filtering
// Requires: admin access only
router.get(
  '/',
  requireAuth,
  requireAdmin,
  requirePermission({ objectType: 'audit_log', objectId: 'hmu' }, 'view'),
  validate({ query: auditQuerySchema }),
  effectToExpress(AuditController.listAuditLogs)
);

// POST /api/audit - Add audit event (typically used by system)
// Requires: admin permission (restrictive since this affects audit trail integrity)
router.post(
  '/',
  requireAuth,
  requirePermission({ objectType: 'audit_log', objectId: 'hmu' }, 'export'),
  validate({ body: auditBodySchema }),
  effectToExpress(AuditController.addAuditEvent)
);

export { router as auditRoutes };
