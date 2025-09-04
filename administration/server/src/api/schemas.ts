import { Schema } from 'effect';

// Common validation patterns
export const EmailSchema = Schema.String.pipe(
  Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
);
export const NonEmptyStringSchema = Schema.String.pipe(Schema.minLength(1));
export const OptionalNonEmptyStringSchema =
  Schema.optional(NonEmptyStringSchema);

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

export const IdParamSchema = Schema.Struct({
  id: Schema.NumberFromString.pipe(Schema.int(), Schema.positive()),
});
