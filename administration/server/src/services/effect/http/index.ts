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

// Re-export pipe for convenience
export { pipe } from 'effect';

/**
 * Example usage:
 *
 * ```typescript
 * router.get(
 *   '/members/:id',
 *   effectToExpress(
 *     pipe(
 *       requireAuth(),
 *       requirePermission('read', 'members'),
 *       parseParams(IdParamSchema),
 *       parseQuery(ListQuerySchema),
 *       MemberController.getMemberDetails,
 *       formatOutput(memberDetailsSchema)
 *     )
 *   )
 * );
 * ```
 */
