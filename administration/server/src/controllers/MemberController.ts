import { Effect } from 'effect';
import type { Request, Response } from 'express';
import { AuditService } from '../services/effect/AuditEffects';
import { MemberService } from '../services/effect/MemberEffects';
import { extractId } from '../services/effect/adapters/expressAdapter';
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
    const query = req.query;
    const { page = 1, limit = 10, search } = query as any;

    const memberService = yield* MemberService;
    const result = yield* memberService.getMembers({
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
    const memberService = yield* MemberService;
    const member = yield* memberService.getMemberById(id);

    return createSuccessResponse(member);
  });

/**
 * Create a new member
 * POST /api/members
 */
export const createMember = (req: Request, res: Response) => {
  res.status(201);
  return Effect.gen(function* () {
    const memberData = req.body;
    const memberService = yield* MemberService;
    const member = yield* memberService.createMember(memberData);

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
    const updateData = req.body;

    const memberService = yield* MemberService;
    const member = yield* memberService.updateMember({ ...updateData, id });

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
    const memberService = yield* MemberService;
    yield* memberService.deleteMember(id);

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
    const body = req.body as { content: string; tags?: string[] };
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
    const memberService = yield* MemberService;
    yield* memberService.getMemberById(id);

    // Log note creation as an audit event
    const auditService = yield* AuditService;
    yield* auditService.logAuditEvent({
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
