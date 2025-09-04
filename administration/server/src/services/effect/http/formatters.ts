/**
 * Output formatters for Effect HTTP pipeline
 *
 * These functions format Effect outputs into standardized REST API responses
 * using the existing response formatter types from the codebase.
 */

import { Effect, Schema } from 'effect';
import { ParseError } from 'effect/ParseResult';
import {
  createPaginatedResponse,
  createSuccessResponse,
  type PaginatedResponse,
  type SuccessResponse,
} from '../../../controllers/helpers/responseFormatters';
import { Express, IExpress } from './context';

/**
 * Format output using a schema and wrap in standard success response
 */
export const formatOutput =
  <A, I = unknown>(schema: Schema.Schema<A, I, never>) =>
  <E>(
    effect: Effect.Effect<any, E, never>
  ): Effect.Effect<SuccessResponse<I>, E | ParseError, never> =>
    effect.pipe(
      Effect.flatMap((data) => Schema.encode(schema)(data)),
      Effect.map((data) => createSuccessResponse(data))
    );

/**
 * Format output as a paginated response
 */
export const paginatedOutput =
  <A, I = unknown>(schema: Schema.Schema<A, I, never>) =>
  <E>(
    effect: Effect.Effect<
      { data: A[]; total: number; page: number; limit: number },
      E,
      never
    >
  ): Effect.Effect<PaginatedResponse<I[]>, E | ParseError, never> =>
    effect.pipe(
      Effect.flatMap((result) => {
        const { data, total, page, limit } = result;
        return Schema.encode(Schema.Array(schema))(data).pipe(
          Effect.map((encodedData) =>
            createPaginatedResponse(encodedData as I[], {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
            })
          )
        );
      })
    );

/**
 * Simple success response without schema encoding
 */
export const successResponse =
  <A>(message?: string) =>
  (
    effect: Effect.Effect<A, any, any>
  ): Effect.Effect<SuccessResponse<A>, any, any> =>
    effect.pipe(Effect.map((data) => createSuccessResponse(data, message)));

/**
 * Content negotiation formatter (basic implementation)
 * Supports JSON (default) and basic CSV for arrays
 */
export const withContentNegotiation = <A>(
  effect: Effect.Effect<SuccessResponse<A>, any, any>
): Effect.Effect<any, any, IExpress> =>
  Effect.gen(function* () {
    const { req, res } = yield* Express;
    const result = yield* effect;

    const acceptHeader = req.headers.accept || 'application/json';

    if (acceptHeader.includes('text/csv') && Array.isArray(result.data)) {
      // Basic CSV conversion for arrays
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="data.csv"');

      if (result.data.length > 0 && typeof result.data[0] === 'object') {
        const headers = Object.keys(result.data[0]).join(',');
        const rows = result.data.map((item) =>
          Object.values(item)
            .map((val) =>
              typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
            )
            .join(',')
        );
        return [headers, ...rows].join('\n');
      }

      return result.data.join('\n');
    }

    // Default to JSON
    res.setHeader('Content-Type', 'application/json');
    return result;
  });

/**
 * Response caching helper
 */
export const withCaching =
  (
    maxAge: number = 300, // 5 minutes default
    options: {
      private?: boolean;
      noCache?: boolean;
      mustRevalidate?: boolean;
    } = {}
  ) =>
  <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E, R | IExpress> =>
    Effect.gen(function* () {
      const { res } = yield* Express;
      const result = yield* effect;

      if (!options.noCache) {
        const cacheDirectives = [
          options.private ? 'private' : 'public',
          `max-age=${maxAge}`,
          options.mustRevalidate ? 'must-revalidate' : null,
        ]
          .filter(Boolean)
          .join(', ');

        res.setHeader('Cache-Control', cacheDirectives);
      } else {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }

      return result;
    });

/**
 * Set custom headers
 */
export const withHeaders =
  (headers: Record<string, string>) =>
  <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E, R | IExpress> =>
    Effect.gen(function* () {
      const { res } = yield* Express;
      const result = yield* effect;

      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      return result;
    });
