/**
 * Effect Schema definitions for API validation
 *
 * These schemas replace the Zod schemas for use in the Effect pipeline,
 * providing better integration with Effect's type system and error handling.
 */

import { Schema } from 'effect';

// Common validation patterns
export const EmailSchema = Schema.String.pipe(
  Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
);
export const NonEmptyStringSchema = Schema.String.pipe(Schema.minLength(1));
export const OptionalNonEmptyStringSchema =
  Schema.optional(NonEmptyStringSchema);

// Member schemas matching the actual database schema
export const CreateMemberSchema = Schema.Struct({
  first_name: NonEmptyStringSchema.pipe(Schema.maxLength(100)),
  last_name: NonEmptyStringSchema.pipe(Schema.maxLength(100)),
  preferred_name: OptionalNonEmptyStringSchema,
  email: EmailSchema.pipe(Schema.maxLength(255)),
  pronouns: Schema.optional(Schema.String.pipe(Schema.maxLength(50))),
  sponsor_notes: Schema.optional(Schema.String.pipe(Schema.maxLength(1000))),
});

export const UpdateMemberSchema = Schema.Struct({
  id: Schema.NumberFromString.pipe(Schema.int()).pipe(Schema.positive()),
  first_name: Schema.optional(NonEmptyStringSchema.pipe(Schema.maxLength(100))),
  last_name: Schema.optional(NonEmptyStringSchema.pipe(Schema.maxLength(100))),
  preferred_name: OptionalNonEmptyStringSchema,
  email: Schema.optional(EmailSchema.pipe(Schema.maxLength(255))),
  pronouns: Schema.optional(Schema.String.pipe(Schema.maxLength(50))),
  sponsor_notes: Schema.optional(Schema.String.pipe(Schema.maxLength(1000))),
});

export const MemberQuerySchema = Schema.Struct({
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
  search: Schema.optional(Schema.String),
});

// Member note schema
export const AddMemberNoteSchema = Schema.Struct({
  content: NonEmptyStringSchema.pipe(Schema.maxLength(1000)),
  tags: Schema.optional(Schema.Array(Schema.String)),
});

// Member output schemas
export const MemberSchema = Schema.Struct({
  id: Schema.Number,
  first_name: Schema.String,
  last_name: Schema.String,
  preferred_name: Schema.Union(Schema.String, Schema.Null),
  email: Schema.String,
  pronouns: Schema.Union(Schema.String, Schema.Null),
  sponsor_notes: Schema.Union(Schema.String, Schema.Null),
  flags: Schema.Union(Schema.String, Schema.Null),
  date_added: Schema.Union(Schema.String, Schema.Null),
  created_at: Schema.Union(Schema.String, Schema.Null),
  updated_at: Schema.Union(Schema.String, Schema.Null),
});

export const MemberListSchema = Schema.Array(MemberSchema);

export const IdParamSchema = Schema.Struct({
  id: Schema.NumberFromString.pipe(Schema.int(), Schema.positive()),
});
