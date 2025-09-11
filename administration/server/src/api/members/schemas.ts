import { Schema } from 'effect';

export const MemberSchema = Schema.Struct({
  id: Schema.Union(Schema.Number, Schema.Null),
  first_name: Schema.String,
  last_name: Schema.String,
  preferred_name: Schema.Union(Schema.String, Schema.Null, Schema.Undefined),
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  pronouns: Schema.Union(Schema.String, Schema.Null, Schema.Undefined),
  sponsor_notes: Schema.Union(Schema.String, Schema.Null, Schema.Undefined),
  flags: Schema.Union(Schema.Number, Schema.Null),
  date_added: Schema.Union(Schema.String, Schema.Null, Schema.Undefined),
  created_at: Schema.Union(Schema.String, Schema.Null),
  updated_at: Schema.Union(Schema.String, Schema.Null),
});

export const CreateMemberSchema = Schema.Struct({
  first_name: Schema.String,
  last_name: Schema.String,
  preferred_name: Schema.optional(Schema.String),
  email: Schema.String.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  pronouns: Schema.optional(Schema.String),
  sponsor_notes: Schema.optional(Schema.String),
});

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

export const MemberQueryOptionsSchema = Schema.Struct({
  page: Schema.Number,
  limit: Schema.Number,
  search: Schema.optional(Schema.String),
});

// Member flag relationship schema
export const MemberFlagSchema = Schema.Struct({
  member_id: Schema.String,
  flag_id: Schema.String,
  granted_at: Schema.NullOr(Schema.DateFromString),
  granted_by: Schema.NullOr(Schema.String),
  expires_at: Schema.NullOr(Schema.DateFromString),
  metadata: Schema.NullOr(Schema.String),
});

// Request schemas
export const GrantFlagSchema = Schema.extend(
  MemberFlagSchema.omit('granted_at', 'granted_by', 'member_id', 'expires_at'),
  Schema.Struct({ expires_at: Schema.optional(Schema.String) })
);

export const RevokeFlagSchema = Schema.Struct({
  reason: Schema.optional(Schema.String),
});
