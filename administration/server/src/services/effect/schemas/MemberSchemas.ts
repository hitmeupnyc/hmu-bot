import { Schema } from 'effect';

export const MemberSchema = Schema.Struct({
  id: Schema.Number,
  first_name: Schema.String,
  last_name: Schema.String,
  preferred_name: Schema.Union(Schema.String, Schema.Null, Schema.Undefined),
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  pronouns: Schema.Union(Schema.String, Schema.Null, Schema.Undefined),
  sponsor_notes: Schema.Union(Schema.String, Schema.Null, Schema.Undefined),
  flags: Schema.Number,
  date_added: Schema.Union(Schema.String, Schema.Null, Schema.Undefined),
  created_at: Schema.String,
  updated_at: Schema.String,
});

export type Member = typeof MemberSchema.Type;

export const CreateMemberSchema = Schema.Struct({
  first_name: Schema.String,
  last_name: Schema.String,
  preferred_name: Schema.optional(Schema.String),
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  pronouns: Schema.optional(Schema.String),
  sponsor_notes: Schema.optional(Schema.String),
  is_professional_affiliate: Schema.optionalWith(Schema.Boolean, {
    default: () => false,
  }),
});

export type CreateMember = typeof CreateMemberSchema.Type;

export const UpdateMemberSchema = Schema.Struct({
  id: Schema.Number,
  first_name: Schema.optional(Schema.String),
  last_name: Schema.optional(Schema.String),
  preferred_name: Schema.optional(Schema.String),
  email: Schema.optional(
    Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
  ),
  pronouns: Schema.optional(Schema.String),
  sponsor_notes: Schema.optional(Schema.String),
});

export type UpdateMember = typeof UpdateMemberSchema.Type;

export const MemberFlagsSchema = Schema.Struct({
  active: Schema.Boolean,
  professional_affiliate: Schema.optionalWith(Schema.Boolean, {
    default: () => false,
  }),
});

export type MemberFlags = typeof MemberFlagsSchema.Type;

export const MemberQueryOptionsSchema = Schema.Struct({
  page: Schema.Number,
  limit: Schema.Number,
  search: Schema.optional(Schema.String),
});

export type MemberQueryOptions = typeof MemberQueryOptionsSchema.Type;
