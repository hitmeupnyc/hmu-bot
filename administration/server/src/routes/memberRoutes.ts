import { Router } from 'express';
import { MemberService } from '../services/MemberService';
import { AuditService } from '../services/AuditService';
import { asyncHandler } from '../middleware/errorHandler';
import { auditMiddleware } from '../middleware/auditMiddleware';
import { CreateMemberRequest, UpdateMemberRequest } from '../types';

const router = Router();
const memberService = new MemberService();
const auditService = AuditService.getInstance();

// Apply audit middleware to all routes
router.use(auditMiddleware);

// GET /api/members - List all members with pagination
router.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string;

  const result = await memberService.getMembers({ page, limit, search });
  
  res.json({
    success: true,
    data: result.members,
    pagination: result.pagination
  });
}));

// GET /api/members/:id - Get single member
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const member = await memberService.getMemberById(id, req.auditInfo);
  
  res.json({
    success: true,
    data: member
  });
}));

// POST /api/members - Create new member
router.post('/', asyncHandler(async (req, res) => {
  const memberData: CreateMemberRequest = req.body;
  const member = await memberService.createMember(memberData);
  
  res.status(201).json({
    success: true,
    data: member,
    message: 'Member created successfully'
  });
}));

// PUT /api/members/:id - Update member
router.put('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const updateData: UpdateMemberRequest = { ...req.body, id };
  
  const member = await memberService.updateMember(updateData, req.auditInfo);
  
  res.json({
    success: true,
    data: member,
    message: 'Member updated successfully'
  });
}));

// DELETE /api/members/:id - Soft delete member
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  
  await memberService.deleteMember(id);
  
  res.json({
    success: true,
    message: 'Member deleted successfully'
  });
}));

// GET /api/members/:id/memberships - Get member's memberships
router.get('/:id/memberships', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const memberships = await memberService.getMemberMemberships(id);
  
  res.json({
    success: true,
    data: memberships
  });
}));

// GET /api/members/:id/events - Get member's event attendance
router.get('/:id/events', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const events = await memberService.getMemberEvents(id);
  
  res.json({
    success: true,
    data: events
  });
}));

// POST /api/members/:id/notes - Add a note to a member
router.post('/:id/notes', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { content, tags = [] } = req.body;
  
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Note content is required'
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
    message: 'Note added successfully'
  });
}));

export { router as memberRoutes };