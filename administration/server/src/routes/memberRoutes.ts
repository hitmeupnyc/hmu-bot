import { Router } from 'express';
import * as MemberController from '../controllers/MemberController';
import { auditMiddleware } from '../middleware/auditLogging';
import { requireAuth, requirePermission } from '../middleware/auth';
import { apiLimiter, readOnlyLimiter } from '../middleware/rateLimiting';
import { validate } from '../middleware/validation';
import {
  createMemberSchema,
  idParamSchema,
  memberQuerySchema,
  updateMemberSchema,
} from '../schemas/validation';
import { effectToExpress } from '../services/effect/adapters/expressAdapter';

/**
 * Member Routes
 *
 * This router defines all member-related API endpoints.
 * Route handlers are delegated to the MemberController for better
 * separation of concerns and improved testability.
 *
 * Middleware Stack:
 * 1. Audit middleware (applied globally)
 * 2. Rate limiting (read-only or API limits)
 * 3. Validation (request schema validation)
 * 4. Controller handler (business logic)
 */

const router = Router();

// Core CRUD Operations

/**
 * GET /api/members
 * List all members with pagination and optional search
 * Requires: read permission on Member
 */
router.get(
  '/',
  requireAuth,
  requirePermission('read', 'Member'),
  readOnlyLimiter,
  validate({ query: memberQuerySchema }),
  effectToExpress(MemberController.listMembers)
);

/**
 * GET /api/members/:id
 * Get a single member by ID
 * Requires: read permission on Member (with ownership check in controller)
 */
router.get(
  '/:id',
  requireAuth,
  requirePermission('read', 'Member'),
  readOnlyLimiter,
  validate({ params: idParamSchema }),
  auditMiddleware('member'),
  effectToExpress(MemberController.getMember)
);

/**
 * POST /api/members
 * Create a new member
 * Requires: create permission on Member
 */
router.post(
  '/',
  requireAuth,
  requirePermission('create', 'Member'),
  apiLimiter,
  validate({ body: createMemberSchema }),
  auditMiddleware('member'),
  effectToExpress(MemberController.createMember)
);

/**
 * PUT /api/members/:id
 * Update an existing member
 * Requires: update permission on Member (with ownership check in controller)
 */
router.put(
  '/:id',
  requireAuth,
  requirePermission('update', 'Member'),
  apiLimiter,
  validate({
    params: idParamSchema,
    body: updateMemberSchema,
  }),
  auditMiddleware('member'),
  effectToExpress(MemberController.updateMember)
);

/**
 * DELETE /api/members/:id
 * Soft delete a member
 * Requires: delete permission on Member (admin only)
 */
router.delete(
  '/:id',
  requireAuth,
  requirePermission('delete', 'Member'),
  apiLimiter,
  validate({ params: idParamSchema }),
  auditMiddleware('member'),
  effectToExpress(MemberController.deleteMember)
);

export { router as memberRoutes };
