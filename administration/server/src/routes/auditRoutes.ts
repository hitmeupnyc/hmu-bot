/**
 * Audit Routes
 *
 * Defines all audit log related API endpoints.
 * Delegates business logic to AuditController.
 * Provides endpoints for retrieving audit logs with proper validation and middleware.
 */

import { NextFunction, Request, Response, Router } from 'express';
import { z, ZodError } from 'zod';
import * as AuditController from '../controllers/AuditController';
import { requireAuth, requirePermission } from '../middleware/auth';
import { effectToExpress } from '../services/effect/adapters/expressAdapter';

export class ValidationError extends Error {
  public statusCode: number;
  public errors: Array<{ field: string; message: string }>;

  constructor(errors: Array<{ field: string; message: string }>) {
    super('Validation failed');
    this.statusCode = 400;
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

// Comprehensive validation middleware that validates all parts of the request
interface ValidationRules<TBody = any, TQuery = any, TParams = any> {
  body?: z.ZodSchema<TBody>;
  query?: z.ZodSchema<TQuery>;
  params?: z.ZodSchema<TParams>;
}

export const validate = <TBody = any, TQuery = any, TParams = any>(
  rules: ValidationRules<TBody, TQuery, TParams>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: Array<{ field: string; message: string }> = [];

    /**
     * Validate the body
     */
    try {
      if (rules.body) {
        req.body = rules.body.parse(req.body);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        errors.push(
          ...error.issues.map((err) => ({
            field: `body.${err.path.join('.')}`,
            message: err.message,
          }))
        );
      }
    }

    /**
     * Validate the query
     */
    try {
      if (rules.query) {
        req.query = rules.query.parse(req.query) as any;
      }
    } catch (error) {
      if (error instanceof ZodError) {
        errors.push(
          ...error.issues.map((err) => ({
            field: `query.${err.path.join('.')}`,
            message: err.message,
          }))
        );
      }
    }

    /**
     * Validate the params
     */
    try {
      if (rules.params) {
        req.params = rules.params.parse(req.params) as any;
      }
    } catch (error) {
      if (error instanceof ZodError) {
        errors.push(
          ...error.issues.map((err) => ({
            field: `params.${err.path.join('.')}`,
            message: err.message,
          }))
        );
      }
    }

    if (errors.length > 0) {
      next(new ValidationError(errors));
    } else {
      next();
    }
  };
};

const dateStringSchema = z
  .string()
  .refine((date) => !isNaN(Date.parse(date)), 'Invalid date format');

// Audit log schemas
export const auditQuerySchema = z
  .object({
    entity_type: z.enum(['member', 'event', 'audit_log']).default('member'),
    entity_id: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(500).default(50),
    page: z.coerce.number().int().min(1).default(1),
    action: z.enum(['create', 'update', 'delete', 'view', 'search']).optional(),
    start_date: dateStringSchema.optional(),
    end_date: dateStringSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        return new Date(data.start_date) <= new Date(data.end_date);
      }
      return true;
    },
    {
      message: 'End date must be after or equal to start date',
      path: ['end_date'],
    }
  );

export const auditBodySchema = z.object({
  entity_type: z.enum(['member', 'event', 'audit_log']).default('member'),
  entity_id: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  page: z.coerce.number().int().min(1).default(1),
  action: z
    .enum(['create', 'update', 'delete', 'view', 'search', 'note'])
    .optional(),
  userSessionId: z.string().optional(),
  userIp: z.string().optional(),
  userEmail: z.string().optional(),
  userId: z.string().optional(),
  oldValues: z.record(z.string(), z.any()).optional(),
  newValues: z.record(z.string(), z.any()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const router = Router();

/**
 * Audit Log Endpoints
 *
 * These endpoints provide access to system audit logs with proper filtering,
 * validation, and audit trail of who accessed what audit information.
 */

// GET /api/audit - Get audit log entries with filtering
router.get(
  '/',
  requireAuth,
  requirePermission('read', 'audit_log'),
  validate({ query: auditQuerySchema }),
  effectToExpress(AuditController.listAuditLogs)
);

// POST /api/audit - Add audit event (typically used by system)
router.post(
  '/',
  requireAuth,
  validate({ body: auditBodySchema }),
  effectToExpress(AuditController.addAuditEvent)
);

export { router as auditRoutes };
