/**
 * Audit Controller
 *
 * Handles all audit log related operations.
 * Provides endpoints for retrieving audit logs with filtering and pagination.
 */

import { Effect } from 'effect';
import { decodeUnknown } from 'effect/Schema';
import { Request, Response } from 'express';
import * as AuditEffects from '../services/effect/AuditEffects';
import { extractQuery } from '../services/effect/adapters/expressAdapter';
import { AuditSchema } from '../services/effect/schemas/AuditSchema';
import { createSuccessResponse } from './helpers/responseFormatters';

/**
 * List audit log entries with optional filtering
 *
 * @param req Express request object with validated query parameters
 * @param res Express response object
 * @returns Effect containing success response with audit logs
 */
export const listAuditLogs = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const query = yield* extractQuery(req);

    // Extract validated parameters (validation middleware ensures type safety)
    const { entity_type, entity_id, limit } = query as {
      entity_type: string;
      entity_id?: number;
      limit: number;
    };

    // Fetch audit logs from service
    const auditLogs = yield* AuditEffects.getAuditLogs(
      entity_type,
      entity_id,
      limit
    );

    return createSuccessResponse(auditLogs);
  });

/**
 * Add an audit event
 *
 * @param req Express request object with validated body parameters
 * @param res Express response object
 * @returns Effect containing success response with audit log
 */
export const addAuditEvent = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const { entity_type, entity_id, action, metadata, oldValues, newValues } =
      yield* decodeUnknown(AuditSchema)(req.body);

    // Log note creation as an audit event
    yield* AuditEffects.logAuditEvent({
      entity_type: entity_type,
      entity_id: entity_id,
      action: action,
      userSessionId: req.session?.id || 'anonymous',
      userId: req.session?.user.id || 'anonymous',
      userEmail: req.session?.user.email || 'anonymous',
      userIp: req.ip || req.socket?.remoteAddress || 'unknown',
      oldValues: oldValues,
      newValues: newValues,
      metadata: metadata,
    });

    return {
      success: true,
      message: 'Audit event added successfully',
    };
  });
