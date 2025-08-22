/**
 * Example migration: Member routes using Effect HTTP pipeline
 *
 * This file demonstrates how to migrate from the traditional Express middleware
 * approach to the new Effect-based pipeline system.
 */

import { Effect, pipe } from 'effect';
import { Router } from 'express';
import { MemberService } from '../../MemberEffects';
import { effectToExpress } from '../../adapters/expressAdapter';
import {
  IdParamSchema,
  MemberQuerySchema,
  formatOutput,
  paginatedOutput,
  parseParams,
  parseQuery,
  requireAuth,
  requirePermission,
} from '../index';
import { useParsedParams, useParsedQuery } from '../parsers';
import { MemberSchema } from '../schemas';

const router = Router();

/**
 * GET /api/members/:id - New Effect pipeline approach
 */
router.get(
  '/:id',
  effectToExpress(
    pipe(
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
  )
);

/**
 * GET /api/members - List members with pagination
 */
router.get(
  '/',
  effectToExpress(
    pipe(
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
  )
);

/**
 * Before (traditional Express middleware):
 *
 * router.get(
 *   '/:id',
 *   requireAuth,
 *   requirePermission('read', 'members'),
 *   readOnlyLimiter,
 *   validate({ params: idParamSchema }),
 *   auditMiddleware('member'),
 *   effectToExpress(MemberController.getMember)
 * );
 *
 *
 * After (Effect pipeline):
 *
 * router.get(
 *   '/:id',
 *   effectToExpress(
 *     pipe(
 *       requireAuth(),
 *       requirePermission('read', 'members'),
 *       parseParams(IdParamSchema),
 *       getMemberById,
 *       formatOutput(MemberSchema)
 *     )
 *   )
 * );
 *
 *
 * Benefits of the new approach:
 *
 * 1. Type Safety: Each step in the pipeline declares its input/output types
 * 2. Composability: Functions compose naturally with pipe()
 * 3. Error Handling: Unified through Effect's error channel
 * 4. Testability: Each function is isolated and pure
 * 5. Context Management: Request data flows through typed context
 * 6. Schema Validation: Built-in with Effect Schema
 * 7. Response Formatting: Standardized and reusable
 */

// Standalone business logic function (easier to test)
const getMemberById = Effect.gen(function* () {
  const { id } = yield* useParsedParams<{ id: number }>();
  const memberService = yield* MemberService;
  return yield* memberService.getMemberById(id);
});

export { router as memberPipelineRoutes };
