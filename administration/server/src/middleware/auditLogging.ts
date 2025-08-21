import { Effect } from 'effect';
import { Request } from 'express';
import { Audit } from '~/services/effect/schemas/AuditSchema';
import { effectToExpress } from '../services/effect/adapters/expressAdapter';
import { AuditService } from '../services/effect/AuditEffects';

// Extend Express Request/Response types
declare global {
  namespace Express {
    interface Request {
      auditInfo?: {
        sessionId: string;
        userIp: string;
      };
      _auditStartTime?: number;
    }
    interface Response {
      _auditEntityType?: string;
      _auditEntityId?: number;
      _auditAction?: string;
      _auditOldData?: any;
      _auditMetadata?: Record<string, any>;
    }
  }
}

const matchRequest = (
  req: Request
): {
  entityId?: number;
  action: 'create' | 'update' | 'delete' | 'view' | 'search' | 'unknown';
} => {
  const id = parseInt(req.params.id);
  const action = (function () {
    switch (req.method) {
      case 'GET':
        return 'view';
      case 'POST':
        return 'create';
      case 'PUT':
        return 'update';
      case 'PATCH':
        return 'update';
      case 'DELETE':
        return 'delete';
      default:
        return 'unknown';
    }
  })();

  return { entityId: id, action };
};

export const auditMiddleware = (entityType: string) =>
  effectToExpress((req, res) =>
    Effect.gen(function* () {
      const { entityId, action } = matchRequest(req);
      if (!entityType || action === 'unknown') {
        return;
      }

      const auditLog = yield* Effect.async<Audit | undefined>((resume) => {
        res.on('finish', () => {
          // Only log successful operations (2xx/3xx status codes)
          if (res.statusCode < 200 || res.statusCode >= 400) {
            resume(Effect.succeed(undefined));
          }

          resume(
            Effect.succeed({
              entity_type: entityType,
              entity_id: entityId,
              action,
              oldValues: res._auditOldData ? res._auditOldData : undefined,
              newValues:
                action === 'create' || action === 'update'
                  ? req.body
                  : undefined,
              metadata: undefined,
              userSessionId: req.session?.id || 'anonymous',
              userId: req.session?.user.id || 'anonymous',
              userEmail: req.session?.user.email || 'anonymous',
              userIp: req.ip || req.socket?.remoteAddress || 'unknown',
            })
          );
        });
      });
      if (auditLog) {
        const auditService = yield* AuditService;
        yield* auditService.logAuditEvent(auditLog);
      }
    })
  );
