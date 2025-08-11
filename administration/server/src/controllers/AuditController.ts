/**
 * Audit Controller
 *
 * Handles all audit log related operations.
 * Provides endpoints for retrieving audit logs with filtering and pagination.
 */

import { Effect } from 'effect';
import { Request, Response } from 'express';
import * as AuditEffects from '../services/effect/AuditEffects';
import { extractQuery } from '../services/effect/adapters/expressAdapter';
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
