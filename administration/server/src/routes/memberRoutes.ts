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

  // Log search activity
  if (search) {
    await auditService.logMemberSearch(
      search, 
      { page, limit }, 
      req.auditInfo?.sessionId, 
      req.auditInfo?.userIp
    );
  }

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
  const member = await memberService.getMemberById(id);
  
  // Log member view
  await auditService.logMemberView(
    id, 
    req.auditInfo?.sessionId, 
    req.auditInfo?.userIp
  );
  
  res.json({
    success: true,
    data: member
  });
}));

// POST /api/members - Create new member
router.post('/', asyncHandler(async (req, res) => {
  const memberData: CreateMemberRequest = req.body;
  const member = await memberService.createMember(memberData);
  
  // Log member creation
  await auditService.logMemberCreate(
    member.id, 
    memberData, 
    req.auditInfo?.sessionId, 
    req.auditInfo?.userIp
  );
  
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
  
  // Get current member data for audit log
  const oldMember = await memberService.getMemberById(id);
  
  const member = await memberService.updateMember(updateData);
  
  // Log member update
  await auditService.logMemberUpdate(
    id, 
    oldMember, 
    updateData, 
    req.auditInfo?.sessionId, 
    req.auditInfo?.userIp
  );
  
  res.json({
    success: true,
    data: member,
    message: 'Member updated successfully'
  });
}));

// DELETE /api/members/:id - Soft delete member
router.delete('/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  
  // Get current member data for audit log
  const memberToDelete = await memberService.getMemberById(id);
  
  await memberService.deleteMember(id);
  
  // Log member deletion
  await auditService.logMemberDelete(
    id, 
    memberToDelete, 
    req.auditInfo?.sessionId, 
    req.auditInfo?.userIp
  );
  
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

export { router as memberRoutes };