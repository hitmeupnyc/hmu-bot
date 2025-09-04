import { Schema } from 'effect';

// Core flag entity schema
export const FlagSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  created_at: Schema.Date,
  updated_at: Schema.Date,
});

export type Flag = typeof FlagSchema.Type;

// Member flag relationship schema
export const MemberFlagSchema = Schema.Struct({
  member_id: Schema.String,
  flag_id: Schema.String,
  name: Schema.String,
  granted_at: Schema.NullOr(Schema.Date),
  granted_by: Schema.NullOr(Schema.String),
  expires_at: Schema.NullOr(Schema.Date),
  metadata: Schema.NullOr(Schema.String),
});

export type MemberFlag = typeof MemberFlagSchema.Type;

// Member with flag details (for flag/:flagId/members endpoint)
export const MemberWithFlagSchema = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  first_name: Schema.String,
  last_name: Schema.String,
  granted_at: Schema.NullOr(Schema.Date),
  granted_by: Schema.NullOr(Schema.String),
  expires_at: Schema.NullOr(Schema.Date),
});

export type MemberWithFlag = typeof MemberWithFlagSchema.Type;

// Request schemas
export const GrantFlagSchema = Schema.Struct({
  flag_id: Schema.String,
  expires_at: Schema.optional(Schema.Date),
  reason: Schema.optional(Schema.String),
  metadata: Schema.optional(Schema.Any),
});

export type GrantFlag = typeof GrantFlagSchema.Type;

export const RevokeFlagSchema = Schema.Struct({
  reason: Schema.optional(Schema.String),
});

export type RevokeFlag = typeof RevokeFlagSchema.Type;

export const BulkFlagOperationSchema = Schema.Struct({
  userId: Schema.String,
  flag_id: Schema.String,
  expires_at: Schema.optional(Schema.Date),
  reason: Schema.optional(Schema.String),
  metadata: Schema.optional(Schema.Any),
});

export type BulkFlagOperation = typeof BulkFlagOperationSchema.Type;

export const BulkFlagRequestSchema = Schema.Struct({
  operations: Schema.Array(BulkFlagOperationSchema),
});

export type BulkFlagRequest = typeof BulkFlagRequestSchema.Type;

// Response schemas
export const ProcessingResultSchema = Schema.Struct({
  processed: Schema.Number,
  errors: Schema.Number,
  duration: Schema.Number,
});

export type ProcessingResult = typeof ProcessingResultSchema.Type;

export const BulkFlagResponseSchema = Schema.Struct({
  success: Schema.Boolean,
  message: Schema.String,
});

export type BulkFlagResponse = typeof BulkFlagResponseSchema.Type;

export const FlagOperationResponseSchema = Schema.Struct({
  success: Schema.Boolean,
  message: Schema.String,
});

export type FlagOperationResponse = typeof FlagOperationResponseSchema.Type;
