import { NextFunction, Request, Response } from 'express';
// Approved by vcarl 2025-09-03
import { db_DO_NOT_USE_WITHOUT_PRIOR_AUTHORIZATION as db } from '~/services/effect/layers/DatabaseLayer';

// Extend Express Request type to include session
declare global {
  namespace Express {
    interface Request {
      session?: {
        id?: string;
        user?: {
          id?: string;
          email?: string;
        };
      };
    }
  }
}

// Parse route to extract entity type, ID, and action
const parseRoute = (path: string, method: string) => {
  const segments = path.split('/').filter(Boolean);

  // Skip 'api' prefix
  if (segments[0] === 'api') segments.shift();

  const entityType = segments[0]?.replace(/s$/, ''); // Remove plural (members -> member)
  const entityId =
    segments[1] && !isNaN(Number(segments[1])) ? parseInt(segments[1]) : null;

  const action = (() => {
    switch (method) {
      case 'GET':
        return entityId ? 'view' : 'search';
      case 'POST':
        return 'create';
      case 'PUT':
      case 'PATCH':
        return 'update';
      case 'DELETE':
        return 'delete';
      default:
        return 'unknown';
    }
  })();

  return { entityType, entityId, action, etc: segments.slice(2) };
};

// Express middleware for audit logging
export const auditMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip non-API routes or auth routes
  if (!req.path.startsWith('/api/') || req.path.startsWith('/api/auth/')) {
    return next();
  }

  const { entityType, entityId, action, etc } = parseRoute(
    req.path,
    req.method
  );

  if (!entityType || action === 'unknown') {
    console.log(
      '[AuditLog]: Skipping -',
      JSON.stringify({
        path: req.path,
        method: req.method,
        entityType,
        entityId,
        action,
        etc,
      })
    );
    return next();
  }
  if (
    entityType === 'audit' ||
    (entityType === 'members' && action === 'note')
  ) {
    console.log(
      '[AuditLog]: Skipping -',
      JSON.stringify({
        path: req.path,
        method: req.method,
        entityType,
        entityId,
        action,
        etc,
      })
    );
    return next();
  }

  // Store the request body as potential newValues
  const newValues =
    (action === 'create' || action === 'update') && req.body ? req.body : null;

  // Set up response listener for when the request completes
  res.on('finish', async () => {
    // Only log successful operations (2xx/3xx status codes)
    if (res.statusCode < 200 || res.statusCode >= 400) {
      console.log(
        '[AuditLog]: Skipping failed request -',
        JSON.stringify({
          path: req.path,
          method: req.method,
          status: res.statusCode,
        })
      );
      return;
    }

    try {
      // Check if database is ready
      if (!db) {
        console.log('[AuditLog]: Database not ready yet, skipping audit log');
        return;
      }

      const auditData = {
        entity_type: entityType,
        entity_id: entityId, // Only number or null as per DB schema
        action,
        user_session_id: req.session?.id || null,
        user_id: req.session?.user?.id || null,
        user_email: req.session?.user?.email || null,
        user_ip: req.ip || req.socket?.remoteAddress || null,
        old_values_json: null, // TODO: Capture old values for updates
        new_values_json: newValues ? JSON.stringify(newValues) : null,
        metadata_json: JSON.stringify({
          userAgent: req.get('User-Agent'),
          referer: req.get('Referer'),
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
        }),
      };

      console.log(
        '[AuditLog]: Logging -',
        JSON.stringify({
          entity_type: auditData.entity_type,
          entity_id: auditData.entity_id,
          action: auditData.action,
          user: auditData.user_email || 'anonymous',
          status: res.statusCode,
        })
      );

      await db.insertInto('audit_log').values(auditData).execute();

      console.log('[AuditLog]: Successfully logged audit entry');
    } catch (error) {
      console.error('[AuditLog]: Failed to log audit entry:', error);
    }
  });

  next();
};
