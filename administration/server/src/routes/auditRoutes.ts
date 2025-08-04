import { Router } from 'express';
import { AuditService } from '../services/AuditService';
import { asyncHandler } from '../middleware/errorHandler';
import { auditMiddleware } from '../middleware/auditMiddleware';

const router = Router();
const auditService = AuditService.getInstance();

// Apply audit middleware
router.use(auditMiddleware);

// GET /api/audit - Get audit log entries
router.get('/', asyncHandler(async (req, res) => {
  const entityType = req.query.entity_type as string;
  const entityId = req.query.entity_id ? parseInt(req.query.entity_id as string) : undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

  const auditLogs = await auditService.getAuditLog(entityType || 'member', entityId, limit);
  
  res.json({
    success: true,
    data: auditLogs
  });
}));

// GET /api/audit/member/:id - Get audit log for specific member
router.get('/member/:id', asyncHandler(async (req, res) => {
  const memberId = parseInt(req.params.id);
  
  const auditLogs = await auditService.getAuditLog('member', memberId, 100);
  
  res.json({
    success: true,
    data: auditLogs
  });
}));

export { router as auditRoutes };