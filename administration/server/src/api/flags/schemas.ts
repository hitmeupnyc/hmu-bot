import { Schema } from 'effect';

// Core flag entity schema
export const FlagSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  created_at: Schema.Date,
  updated_at: Schema.Date,
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

export const BulkFlagRequestSchema = Schema.Struct({
  operations: Schema.Array(
    Schema.extend(
      MemberFlagSchema.omit('granted_at', 'granted_by', 'expires_at'),
      Schema.Struct({ expires_at: Schema.optional(Schema.String) })
    )
  ),
});
