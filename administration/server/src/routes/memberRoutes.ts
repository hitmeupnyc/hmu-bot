/**
 * Example migration: Member routes using Effect HTTP pipeline
 *
 * This file demonstrates how to migrate from the traditional Express middleware
 * approach to the new Effect-based pipeline system.
 */

import { Effect } from 'effect';
import { Router } from 'express';
import { withExpress } from '~/services/effect/adapters/expressAdapter';
import {
  IdParamSchema,
  MemberQuerySchema,
  formatOutput,
  paginatedOutput,
  parseParams,
  parseQuery,
  requireAuth,
  requirePermission,
  useParsedParams,
  useParsedQuery,
} from '~/services/effect/http';
import { MemberService } from '~/services/effect/MemberEffects';
import { MemberSchema } from '~/services/effect/schemas/MemberSchemas';

const router = Router();

/**
 * GET /api/members/:id - New Effect pipeline approach
 */
router.get('/:id', (req, res, next) =>
  Effect.void.pipe(
    withExpress(req, res, next),
    requireAuth(),
    requirePermission('read', 'members'),
    parseParams(IdParamSchema),
    Effect.flatMap(() =>
      Effect.gen(function* () {
        const { id } = yield* useParsedParams<{ id: number }>();
        const memberService = yield* MemberService;
        const member = yield* memberService.getMemberById(id);
        return member;
      })
    ),
    formatOutput(MemberSchema)
  )
);

/**
 * GET /api/members - List members with pagination
 */
router.get('/', (req, res, next) =>
  Effect.void.pipe(
    withExpress(req, res, next),
    requireAuth(),
    requirePermission('read', 'members'),
    parseQuery(MemberQuerySchema),
    Effect.flatMap(() =>
      Effect.gen(function* () {
        const query = yield* useParsedQuery<{
          page: number;
          limit: number;
          search?: string;
        }>();
        const memberService = yield* MemberService;
        const result = yield* memberService.getMembers({
          page: query.page,
          limit: query.limit,
          search: query.search,
        });

        return {
          data: result.members,
          total: result.pagination.total,
          page: query.page,
          limit: query.limit,
        };
      })
    ),
    paginatedOutput(MemberSchema)
  )
);

export { router as memberPipelineRoutes };
