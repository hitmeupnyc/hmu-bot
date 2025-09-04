/**
 * Schema-based request parsers for Effect HTTP pipeline
 *
 * These functions parse and validate request data (body, query, params)
 * using Effect Schema and inject the parsed data into the request context.
 */

import { Effect, Schema } from 'effect';
import type { ParseError } from 'effect/ParseResult';
import {
  Express,
  IExpress,
  ParsedBody,
  ParsedParams,
  ParsedQuery,
} from './context';

/**
 * Parse request body using provided schema and add to context
 */
export const parseBody =
  <A, I = unknown, R = never>(schema: Schema.Schema<A, I, R>) =>
  <E, R2>(
    effect: Effect.Effect<any, E, R2>
  ): Effect.Effect<any, E | ParseError, R | R2 | IExpress> =>
    Effect.gen(function* () {
      const { req } = yield* Express;
      const parsed = yield* Schema.decodeUnknown(schema)(req.body);
      return yield* effect.pipe(Effect.provideService(ParsedBody, parsed));
    });

/**
 * Parse query parameters using provided schema and add to context
 */
export const parseQuery =
  <A, I = unknown, R = never>(schema: Schema.Schema<A, I, R>) =>
  <E, R2>(
    effect: Effect.Effect<any, E, R2>
  ): Effect.Effect<any, E | ParseError, R | R2 | IExpress> =>
    Effect.gen(function* () {
      const { req } = yield* Express;
      const parsed = yield* Schema.decodeUnknown(schema)(req.query);
      return yield* effect.pipe(Effect.provideService(ParsedQuery, parsed));
    });

/**
 * Parse URL parameters using provided schema and add to context
 */
export const parseParams =
  <A, I = unknown, R = never>(schema: Schema.Schema<A, I, R>) =>
  <E, R2>(
    effect: Effect.Effect<any, E, R2>
  ): Effect.Effect<any, E | ParseError, R | R2 | IExpress> =>
    Effect.gen(function* () {
      const { req } = yield* Express;
      const parsed = yield* Schema.decodeUnknown(schema)(req.params);
      return yield* effect.pipe(Effect.provideService(ParsedParams, parsed));
    });

// Common query schemas for reuse
export const PaginationSchema = Schema.Struct({
  page: Schema.optional(
    Schema.NumberFromString.pipe(Schema.int()).pipe(Schema.positive())
  ).pipe(
    Schema.withDefaults({
      constructor: () => 1,
      decoding: () => 1,
    })
  ),
  limit: Schema.optional(
    Schema.NumberFromString.pipe(Schema.int())
      .pipe(Schema.positive())
      .pipe(Schema.lessThanOrEqualTo(100))
  ).pipe(
    Schema.withDefaults({
      constructor: () => 20,
      decoding: () => 20,
    })
  ),
});

export const SortSchema = Schema.Struct({
  sortBy: Schema.optional(Schema.String),
  sortOrder: Schema.optional(Schema.Literal('asc', 'desc')).pipe(
    Schema.withDefaults({
      constructor: () => 'asc' as const,
      decoding: () => 'asc' as const,
    })
  ),
});

export const FilterSchema = Schema.Struct({
  search: Schema.optional(Schema.String),
  status: Schema.optional(Schema.String),
  createdAfter: Schema.optional(Schema.DateFromString),
  createdBefore: Schema.optional(Schema.DateFromString),
});

// Combined query schema with pagination, sorting, and filtering
export const ListQuerySchema = Schema.extend(
  PaginationSchema,
  Schema.extend(SortSchema, FilterSchema)
);

// Helper to access parsed data from context
export const useParsedBody = <A>() =>
  ParsedBody.pipe(Effect.map((body) => body as A));

export const useParsedQuery = <A>() =>
  ParsedQuery.pipe(Effect.map((query) => query as A));

export const useParsedParams = <A>() =>
  ParsedParams.pipe(Effect.map((params) => params as A));
