/**
 * Effect HTTP Pipeline - Main exports
 *
 * This module provides a complete Effect-based HTTP handling system for Express,
 * enabling type-safe, composable request processing pipelines.
 */

// Context and types
export * from './context';

// Request parsers
export * from './parsers';

// Schema exports
export * from './schemas';

// Response formatters
export * from './formatters';

// Authentication and authorization
export * from './auth';

// Effect router
export * from './router';

/**
 * Example usage:
 *
 * ```typescript
 * import { createEffectRouter, pipe } from '~/services/effect/http';
 *
 * const router = createEffectRouter();
 *
 * router.get('/members/:id',
 *   pipe(
 *     requireAuth(),
 *     requirePermission('read', 'members'),
 *     parseParams(IdParamSchema),
 *     parseQuery(ListQuerySchema),
 *     MemberController.getMemberDetails,
 *     formatOutput(memberDetailsSchema)
 *   )
 * );
 *
 * export const memberRoutes = router.express;
 * ```
 */
