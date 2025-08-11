/**
 * Audit Middleware Factory
 * 
 * Provides reusable middleware factories for audit logging across different router types.
 * Separates audit logging concerns from business logic to maintain clean architecture.
 */

import { Request, Response, NextFunction } from 'express';
import { auditMiddleware } from './auditLoggingMiddleware';

/**
 * Configuration for entity-specific audit logging
 */
export interface AuditConfig {
  /** Entity type for audit logs (e.g., 'member', 'event') */
  entityType: string;
  /** Function to extract entity ID from request/response */
  getEntityId?: (req: Request, res: Response) => number | undefined;
  /** Function to determine the action being performed */
  getAction?: (req: Request) => string;
  /** Function to determine if this request should be audited */
  shouldAudit?: (req: Request, res: Response) => boolean;
  /** Function to extract additional metadata for audit logs */
  getMetadata?: (req: Request, res: Response) => Record<string, any> | undefined;
}

/**
 * Creates audit middleware for read-only operations
 * Useful for routes that only query data but still need audit trails
 */
export const createReadAuditMiddleware = (config: Pick<AuditConfig, 'entityType'>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set minimal audit info for read operations
    res._auditEntityType = config.entityType;
    res._auditAction = 'view';
    
    // Apply the full audit middleware
    auditMiddleware(req, res, next);
  };
};

/**
 * Creates audit middleware for write operations (create/update/delete)
 * Provides more comprehensive audit logging with before/after state tracking
 */
export const createWriteAuditMiddleware = (config: AuditConfig) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set audit configuration on response object
    res._auditEntityType = config.entityType;
    res._auditAction = config.getAction?.(req) || 'unknown';
    
    if (config.getEntityId) {
      res._auditEntityId = config.getEntityId(req, res);
    }
    
    if (config.getMetadata) {
      res._auditMetadata = config.getMetadata(req, res);
    }
    
    // Apply conditional auditing if specified
    if (config.shouldAudit && !config.shouldAudit(req, res)) {
      return next();
    }
    
    // Apply the full audit middleware
    auditMiddleware(req, res, next);
  };
};

/**
 * Creates a simple audit middleware that just applies the base audit middleware
 * Useful for routes where the existing auditLoggingMiddleware handles all logic
 */
export const createStandardAuditMiddleware = () => {
  return auditMiddleware;
};

/**
 * Pre-configured audit middleware for common entity types
 */
export const auditMiddlewares = {
  /** Audit middleware for member-related operations */
  member: createStandardAuditMiddleware(),
  
  /** Audit middleware for event-related operations */  
  event: createStandardAuditMiddleware(),
  
  /** Read-only audit middleware for audit log viewing */
  auditLog: createReadAuditMiddleware({ entityType: 'audit_log' }),
} as const;

/**
 * Helper to create audit middleware for custom entity types
 * 
 * @param entityType The entity type for audit logging
 * @param options Optional configuration for the audit middleware
 * @returns Configured audit middleware function
 */
export const createEntityAuditMiddleware = (
  entityType: string, 
  options: Omit<AuditConfig, 'entityType'> = {}
) => {
  return createWriteAuditMiddleware({
    entityType,
    ...options
  });
};