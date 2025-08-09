import { Effect } from 'effect';
import { Router } from 'express';
import { auditMiddleware } from '../middleware/auditMiddleware';
import { apiLimiter, readOnlyLimiter } from '../middleware/rateLimiting';
import { validate } from '../middleware/validation';
import {
  createMemberSchema,
  idParamSchema,
  memberQuerySchema,
  updateMemberSchema,
} from '../schemas/validation';
import * as MemberEffects from '../services/effect/MemberEffects';
import {
  effectToExpress,
  extractAuditInfo,
  extractBody,
  extractId,
  extractQuery,
} from '../services/effect/adapters/expressAdapter';

const router = Router();

// Apply audit middleware to all routes
router.use(auditMiddleware);

// GET /api/members - List all members with pagination
router.get(
  '/',
  readOnlyLimiter,
  validate({ query: memberQuerySchema }),
  effectToExpress((req, res) =>
    Effect.gen(function* () {
      const query = yield* extractQuery(req);
      const { page = 1, limit = 10, search } = query as any;
      const result = yield* MemberEffects.getMembers({
        page: Number(page),
        limit: Number(limit),
        search,
      });

      return {
        success: true,
        data: result.members,
        pagination: result.pagination,
      };
    })
  )
);

// GET /api/members/:id - Get single member
router.get(
  '/:id',
  readOnlyLimiter,
  validate({ params: idParamSchema }),
  effectToExpress((req, res) =>
    Effect.gen(function* () {
      const id = yield* extractId(req);
      const auditInfo = yield* extractAuditInfo(req);
      const member = yield* MemberEffects.getMemberById(id, auditInfo);

      return {
        success: true,
        data: member,
      };
    })
  )
);

// POST /api/members - Create new member
router.post(
  '/',
  apiLimiter,
  validate({ body: createMemberSchema }),
  effectToExpress((req, res) => {
    res.status(201);
    return Effect.gen(function* () {
      const memberData = yield* extractBody<any>(req);
      const member = yield* MemberEffects.createMember(memberData);

      return {
        success: true,
        data: member,
        message: 'Member created successfully',
      };
    });
  })
);

// PUT /api/members/:id - Update member
router.put(
  '/:id',
  apiLimiter,
  validate({
    params: idParamSchema,
    body: updateMemberSchema,
  }),
  effectToExpress((req, res) =>
    Effect.gen(function* () {
      const id = yield* extractId(req);
      const updateData = yield* extractBody<any>(req);
      const auditInfo = yield* extractAuditInfo(req);
      const member = yield* MemberEffects.updateMember(
        { ...updateData, id },
        auditInfo
      );

      return {
        success: true,
        data: member,
        message: 'Member updated successfully',
      };
    })
  )
);

// DELETE /api/members/:id - Soft delete member
router.delete(
  '/:id',
  apiLimiter,
  validate({ params: idParamSchema }),
  effectToExpress((req, res) =>
    Effect.gen(function* () {
      const id = yield* extractId(req);
      yield* MemberEffects.deleteMember(id);

      return {
        success: true,
        message: 'Member deleted successfully',
      };
    })
  )
);

// GET /api/members/:id/memberships - Get member's memberships
router.get(
  '/:id/memberships',
  readOnlyLimiter,
  validate({ params: idParamSchema }),
  effectToExpress((req, res) =>
    Effect.gen(function* () {
      const id = yield* extractId(req);
      const memberships = yield* MemberEffects.getMemberMemberships(id);

      return {
        success: true,
        data: memberships,
      };
    })
  )
);

// GET /api/members/:id/events - Get member's event attendance
router.get(
  '/:id/events',
  readOnlyLimiter,
  validate({ params: idParamSchema }),
  effectToExpress((req, res) =>
    Effect.gen(function* () {
      const id = yield* extractId(req);
      const events = yield* MemberEffects.getMemberEvents(id);

      return {
        success: true,
        data: events,
      };
    })
  )
);

// POST /api/members/:id/notes - Add a note to a member
router.post(
  '/:id/notes',
  effectToExpress((req, res) =>
    Effect.gen(function* () {
      const id = yield* extractId(req);
      const body = yield* extractBody<{ content: string; tags?: string[] }>(req);
      const { content, tags = [] } = body;

      if (
        !content ||
        typeof content !== 'string' ||
        content.trim().length === 0
      ) {
        return yield* Effect.fail(
          new Error('Note content is required')
        );
      }

      // Verify member exists
      const member = yield* MemberEffects.getMemberById(id);

      // For now, we'll just log this as a regular audit event
      // In the future, this could be a specific note effect
      const auditInfo = yield* extractAuditInfo(req);
      
      // Log as audit event with metadata containing the note
      yield* Effect.tryPromise(async () => {
        console.log('Member note added:', {
          memberId: id,
          content: content.trim(),
          tags,
          sessionId: auditInfo.sessionId,
          userIp: auditInfo.userIp,
        });
      });

      return {
        success: true,
        message: 'Note added successfully',
      };
    })
  )
);

export { router as memberRoutes };
