import { Effect } from 'effect';
import type { Request, Response } from 'express';
import * as AuditEffects from '../services/effect/AuditEffects';
import * as MemberEffects from '../services/effect/MemberEffects';
import {
  extractBody,
  extractId,
  extractQuery,
} from '../services/effect/adapters/expressAdapter';
import {
  createPaginatedResponse,
  createSuccessResponse,
  createSuccessResponseWithMessage,
} from './helpers/responseFormatters';

/**
 * MemberController
 *
 * This controller encapsulates all member-related route handlers.
 * Each handler is a pure function that returns an Effect, maintaining
 * the functional programming paradigm while improving code organization.
 */

/**
 * List all members with pagination and search
 * GET /api/members
 */
export const listMembers = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const query = yield* extractQuery(req);
    const { page = 1, limit = 10, search } = query as any;

    const result = yield* MemberEffects.getMembers({
      page: Number(page),
      limit: Number(limit),
      search,
    });

    return createPaginatedResponse(result.members, result.pagination);
  });

/**
 * Get a single member by ID
 * GET /api/members/:id
 */
export const getMember = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const id = yield* extractId(req);
    const member = yield* MemberEffects.getMemberById(id);

    return createSuccessResponse(member);
  });

/**
 * Create a new member
 * POST /api/members
 */
export const createMember = (req: Request, res: Response) => {
  res.status(201);
  return Effect.gen(function* () {
    const memberData = yield* extractBody<any>(req);
    const member = yield* MemberEffects.createMember(memberData);

    return createSuccessResponseWithMessage(
      member,
      'Member created successfully'
    );
  });
};

/**
 * Update an existing member
 * PUT /api/members/:id
 */
export const updateMember = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const id = yield* extractId(req);
    const updateData = yield* extractBody<any>(req);

    const member = yield* MemberEffects.updateMember({ ...updateData, id });

    return createSuccessResponseWithMessage(
      member,
      'Member updated successfully'
    );
  });

/**
 * Soft delete a member
 * DELETE /api/members/:id
 */
export const deleteMember = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const id = yield* extractId(req);
    yield* MemberEffects.deleteMember(id);

    return {
      success: true,
      message: 'Member deleted successfully',
    };
  });

/**
 * Add a note to a member
 * POST /api/members/:id/notes
 *
 * This handler includes validation logic for the note content.
 * In the future, this could be extracted to a dedicated NoteEffects service.
 */
export const addMemberNote = (req: Request, res: Response) =>
  Effect.gen(function* () {
    const id = yield* extractId(req);
    const body = yield* extractBody<{ content: string; tags?: string[] }>(req);
    const { content, tags = [] } = body;

    // Validate note content
    if (
      !content ||
      typeof content !== 'string' ||
      content.trim().length === 0
    ) {
      return yield* Effect.fail(new Error('Note content is required'));
    }

    // Verify member exists
    yield* MemberEffects.getMemberById(id);

    // Log note creation as an audit event
    yield* AuditEffects.logAuditEvent({
      entity_type: 'member',
      entity_id: id,
      action: 'note',
      userSessionId: req.session?.id || 'anonymous',
      userId: req.session?.user.id || 'anonymous',
      userEmail: req.session?.user.email || 'anonymous',
      userIp: req.ip || req.socket?.remoteAddress || 'unknown',
      oldValues: undefined,
      newValues: undefined,
      metadata: {
        content: content.trim(),
        tags,
      },
    });

    return {
      success: true,
      message: 'Note added successfully',
    };
  });
