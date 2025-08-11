import { Router } from 'express';
import * as MemberController from '../controllers/MemberController';
import { auditMiddleware } from '../middleware/auditLogging';
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

// ============================================================================
// Core CRUD Operations
// ============================================================================

/**
 * GET /api/members
 * List all members with pagination and optional search
 */
router.get(
  '/',
  readOnlyLimiter,
  validate({ query: memberQuerySchema }),
  effectToExpress(MemberController.listMembers)
);

/**
 * GET /api/members/:id
 * Get a single member by ID
 */
router.get(
  '/:id',
  readOnlyLimiter,
  validate({ params: idParamSchema }),
  auditMiddleware('member'),
  effectToExpress(MemberController.getMember)
);

/**
 * POST /api/members
 * Create a new member
 */
router.post(
  '/',
  apiLimiter,
  validate({ body: createMemberSchema }),
  auditMiddleware('member'),
  effectToExpress(MemberController.createMember)
);

/**
 * PUT /api/members/:id
 * Update an existing member
 */
router.put(
  '/:id',
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
 */
router.delete(
  '/:id',
  apiLimiter,
  validate({ params: idParamSchema }),
  auditMiddleware('member'),
  effectToExpress(MemberController.deleteMember)
);

// ============================================================================
// Related Resource Endpoints
// ============================================================================

/**
 * GET /api/members/:id/memberships
 * Get all memberships for a specific member
 */
router.get(
  '/:id/memberships',
  readOnlyLimiter,
  validate({ params: idParamSchema }),
  auditMiddleware('member-memberships'),
  effectToExpress(MemberController.getMemberMemberships)
);

/**
 * GET /api/members/:id/events
 * Get event attendance history for a specific member
 */
router.get(
  '/:id/events',
  readOnlyLimiter,
  validate({ params: idParamSchema }),
  auditMiddleware('member-events'),
  effectToExpress(MemberController.getMemberEvents)
);

export { router as memberRoutes };
