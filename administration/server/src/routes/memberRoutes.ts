import { Effect } from 'effect';
import { Router } from 'express';
import { auditMiddleware } from '../middleware/auditMiddleware';
import { asyncHandler } from '../middleware/errorHandler';
import { apiLimiter, readOnlyLimiter } from '../middleware/rateLimiting';
import { validate } from '../middleware/validation';
import {
  createMemberSchema,
  idParamSchema,
  memberQuerySchema,
  updateMemberSchema,
} from '../schemas/validation';
import { AuditService } from '../services/AuditService';
import * as MemberEffects from '../services/effect/MemberEffects';
import {
  effectToExpress,
  extractAuditInfo,
  extractBody,
  extractId,
  extractQuery,
} from '../services/effect/adapters/expressAdapter';
import { DatabaseLive } from '../services/effect/layers/DatabaseLayer';

const router = Router();
const auditService = AuditService.getInstance();

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
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const { content, tags = [] } = req.body;

    if (
      !content ||
      typeof content !== 'string' ||
      content.trim().length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required',
      });
    }

    // Verify member exists using Effect
    const memberEffect = Effect.gen(function* () {
      return yield* MemberEffects.getMemberById(id);
    });

    await Effect.runPromise(memberEffect.pipe(Effect.provide(DatabaseLive)));

    // Log the note
    await auditService.logMemberNote(
      id,
      content.trim(),
      Array.isArray(tags) ? tags : [],
      req.auditInfo?.sessionId,
      req.auditInfo?.userIp
    );

    res.status(201).json({
      success: true,
      message: 'Note added successfully',
    });
  })
);

export { router as memberRoutes };
