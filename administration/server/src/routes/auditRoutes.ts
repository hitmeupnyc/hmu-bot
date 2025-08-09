import { Effect } from 'effect';
import { Router } from 'express';
import { auditMiddleware } from '../middleware/auditMiddleware';
import * as AuditEffects from '../services/effect/AuditEffects';
import {
  effectToExpress,
  extractId,
  extractQuery,
} from '../services/effect/adapters/expressAdapter';

const router = Router();

// Apply audit middleware
router.use(auditMiddleware);

// GET /api/audit - Get audit log entries
router.get(
  '/',
  effectToExpress((req, res) =>
    Effect.gen(function* () {
      const query = yield* extractQuery(req);
      const entityType = (query as any).entity_type as string;
      const entityId = (query as any).entity_id
        ? parseInt((query as any).entity_id as string)
        : undefined;
      const limit = (query as any).limit
        ? parseInt((query as any).limit as string)
        : 50;

      const auditLogs = yield* AuditEffects.getAuditLogs(
        entityType || 'member',
        entityId,
        limit
      );

      return {
        success: true,
        data: auditLogs,
      };
    })
  )
);

// GET /api/audit/member/:id - Get audit log for specific member
router.get(
  '/member/:id',
  effectToExpress((req, res) =>
    Effect.gen(function* () {
      const memberId = yield* extractId(req);

      const auditLogs = yield* AuditEffects.getAuditLogs(
        'member',
        memberId,
        100
      );

      return {
        success: true,
        data: auditLogs,
      };
    })
  )
);

export { router as auditRoutes };