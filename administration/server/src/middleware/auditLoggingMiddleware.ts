import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/AuditService';
import { MemberService } from '../services/MemberService';

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

interface RouteConfig {
  entityType: string;
  getEntityId?: (req: Request, res: Response) => number | undefined;
  getAction?: (req: Request) => string;
  shouldAudit?: (req: Request, res: Response) => boolean;
  getMetadata?: (req: Request, res: Response) => Record<string, any> | undefined;
}

// Configuration for different API routes
const ROUTE_CONFIGS: { [pattern: string]: RouteConfig } = {
  // Member routes
  '/api/members': {
    entityType: 'member',
    getAction: (req) => {
      switch (req.method) {
        case 'GET': return req.query.search ? 'search' : 'list';
        case 'POST': return 'create';
        default: return 'unknown';
      }
    },
    getMetadata: (req) => {
      if (req.method === 'GET' && req.query.search) {
        return {
          searchTerm: req.query.search,
          page: req.query.page,
          limit: req.query.limit
        };
      }
      return undefined;
    }
  },
  '/api/members/:id': {
    entityType: 'member',
    getEntityId: (req) => parseInt(req.params.id),
    getAction: (req) => {
      switch (req.method) {
        case 'GET': return 'view';
        case 'PUT': return 'update';
        case 'DELETE': return 'delete';
        default: return 'unknown';
      }
    }
  },
  // Event routes (for future use)
  '/api/events': {
    entityType: 'event',
    getAction: (req) => {
      switch (req.method) {
        case 'GET': return 'list';
        case 'POST': return 'create';
        default: return 'unknown';
      }
    }
  },
  '/api/events/:id': {
    entityType: 'event',
    getEntityId: (req) => parseInt(req.params.id),
    getAction: (req) => {
      switch (req.method) {
        case 'GET': return 'view';
        case 'PUT': return 'update';
        case 'DELETE': return 'delete';
        default: return 'unknown';
      }
    }
  }
};

/**
 * Matches a route path with parameters against configured patterns
 */
function matchRoute(path: string): RouteConfig | null {
  for (const pattern in ROUTE_CONFIGS) {
    const regex = new RegExp('^' + pattern.replace(/:\w+/g, '\\d+') + '$');
    if (regex.test(path)) {
      return ROUTE_CONFIGS[pattern];
    }
  }
  return null;
}

const auditPreMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req._auditStartTime = Date.now();
  
  const config = matchRoute(req.path);
  if (!config) {
    return next();
  }

  const actionRaw = config.getAction?.(req) || 'unknown';
  const action = ['create', 'update', 'delete', 'view', 'search'].includes(actionRaw) 
    ? actionRaw as 'create' | 'update' | 'delete' | 'view' | 'search'
    : 'view';
  const entityId = config.getEntityId?.(req, res);

  // For updates and deletes, capture the old data
  if ((action === 'update' || action === 'delete') && entityId && config.entityType === 'member') {
    // Capture old member data before modification with timeout
    Promise.race([
      MemberService.prototype.getMemberById.call(new MemberService(), entityId),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
    ])
      .then(oldData => {
        res._auditOldData = oldData;
      })
      .catch(error => {
        console.warn('Failed to capture old data for audit:', error.message);
      })
      .finally(() => {
        next();
      });
  } else {
    next();
  }
};

const auditPostMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Only log successful operations (2xx status codes)
  if (res.statusCode < 200 || res.statusCode >= 300) {
    return next();
  }

  const config = matchRoute(req.path);
  if (!config) {
    return next();
  }

  const auditService = AuditService.getInstance();
  const actionRaw = config.getAction?.(req) || 'unknown';
  const action = ['create', 'update', 'delete', 'view', 'search'].includes(actionRaw) 
    ? actionRaw as 'create' | 'update' | 'delete' | 'view' | 'search'
    : 'view';
  const entityId = config.getEntityId?.(req, res);
  const metadata = config.getMetadata?.(req, res);

  // Skip audit logging if configured to do so
  if (config.shouldAudit && !config.shouldAudit(req, res)) {
    return next();
  }

  // Prepare audit data
  const auditData = {
    entityType: config.entityType,
    entityId,
    action,
    userSessionId: req.auditInfo?.sessionId,
    userIp: req.auditInfo?.userIp,
    oldValues: res._auditOldData,
    newValues: action === 'create' || action === 'update' ? req.body : undefined,
    metadata
  };

  // Log audit entry asynchronously (don't block response)
  auditService.logEvent(auditData).catch(error => {
    console.error('Failed to log audit event:', error);
  });

  next();
};

/**
 * Combined middleware that handles both pre and post audit logging
 */
export const auditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  auditPreMiddleware(req, res, () => {
    // Hook into response finish to log after response is sent
    const originalSend = res.send;
    res.send = function(data) {
      // Call original send first
      const result = originalSend.call(this, data);
      
      // Then log audit (async, won't delay response)
      setImmediate(() => {
        auditPostMiddleware(req, res, () => {});
      });
      
      return result;
    };
    
    next();
  });
};