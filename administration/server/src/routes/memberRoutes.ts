import { Router } from 'express';
import { auditMiddleware } from '../middleware/auditMiddleware';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { apiLimiter, readOnlyLimiter } from '../middleware/rateLimiting';
import { validate } from '../middleware/validation';
import {
  createMemberSchema,
  idParamSchema,
  memberQuerySchema,
  updateMemberSchema,
} from '../schemas/validation';
import { AuditService } from '../services/AuditService';
import { MemberService } from '../services/MemberService';

const router = Router();
const memberService = new MemberService();
const auditService = AuditService.getInstance();

// Apply audit middleware to all routes
router.use(auditMiddleware);

// GET /api/members - List all members with pagination
router.get(
  '/',
  readOnlyLimiter,
  validate({ query: memberQuerySchema }),
  asyncHandler(async (req, res) => {
    const { page, limit, search } = req.query as any;
    const result = await memberService.getMembers({ page, limit, search });

    res.json({
      success: true,
      data: result.members,
      pagination: result.pagination,
    });
  })
);

// GET /api/members/:id - Get single member
router.get(
  '/:id',
  readOnlyLimiter,
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as any;
    const member = await memberService.getMemberById(id, req.auditInfo);

    if (!member) {
      throw createError('Member not found', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: member,
    });
  })
);

// POST /api/members - Create new member
router.post(
  '/',
  apiLimiter,
  validate({ body: createMemberSchema }),
  asyncHandler(async (req, res) => {
    const memberData = req.body;
    const member = await memberService.createMember(memberData);

    res.status(201).json({
      success: true,
      data: member,
      message: 'Member created successfully',
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
  asyncHandler(async (req, res) => {
    const { id } = req.params as any;
    const updateData = { ...req.body, id };

    const member = await memberService.updateMember(updateData, req.auditInfo);

    if (!member) {
      throw createError('Member not found', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: member,
      message: 'Member updated successfully',
    });
  })
);

// DELETE /api/members/:id - Soft delete member
router.delete(
  '/:id',
  apiLimiter,
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as any;

    await memberService.deleteMember(id);

    res.json({
      success: true,
      message: 'Member deleted successfully',
    });
  })
);

// GET /api/members/:id/memberships - Get member's memberships
router.get(
  '/:id/memberships',
  readOnlyLimiter,
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as any;
    const memberships = await memberService.getMemberMemberships(id);

    res.json({
      success: true,
      data: memberships,
    });
  })
);

// GET /api/members/:id/events - Get member's event attendance
router.get(
  '/:id/events',
  readOnlyLimiter,
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as any;
    const events = await memberService.getMemberEvents(id);

    res.json({
      success: true,
      data: events,
    });
  })
);

// POST /api/members/:id/notes - Add a note to a member
router.post(
  '/:id/notes',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id);
    const { content, tags = [] } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required',
      });
    }

    // Verify member exists
    await memberService.getMemberById(id);

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
