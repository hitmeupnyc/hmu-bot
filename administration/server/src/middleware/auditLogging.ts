import { Effect, Exit } from 'effect';
import { NextFunction, Request, Response } from 'express';
import * as AuditEffects from '../services/effect/AuditEffects';
import { DatabaseLive } from '../services/effect/layers/DatabaseLayer';

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

export const auditMiddleware =
  (entityType: string) => (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      console.log('auditPostMiddleware', res.statusCode);
      // Only log successful operations (2xx/3xx status codes)
      if (res.statusCode < 200 || res.statusCode >= 400) {
        return next();
      }

      const { entityId, action } = matchRequest(req);
      console.log(entityType, entityId, action);
      if (!entityType || action === 'unknown') {
        return next();
      }

      // Prepare audit data
      const auditData = {
        entityType,
        entityId,
        action,
        userSessionId: req.auditInfo?.sessionId,
        userIp: req.auditInfo?.userIp,
        oldValues: res._auditOldData ? res._auditOldData : undefined,
        newValues:
          action === 'create' || action === 'update' ? req.body : undefined,
        metadata: undefined,
      };

      // Log audit entry asynchronously (don't block response)
      const logEffect = AuditEffects.logAuditEvent(auditData).pipe(
        Effect.provide(DatabaseLive)
      );

      console.log('Logging audit event:', auditData);

      Effect.runPromiseExit(logEffect).then((exit) => {
        Exit.match(exit, {
          onFailure: (cause) => {
            console.error('Failed to log audit event:', cause);
          },
          onSuccess: () => {},
        });
      });
    });
    next();
  };
