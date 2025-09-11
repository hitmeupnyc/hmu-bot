import { Schema } from 'effect';
import { MemberFlagSchema } from '../members/schemas';

// Core flag entity schema
export const FlagSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  created_at: Schema.Date,
  updated_at: Schema.Date,
});

export const BulkFlagRequestSchema = Schema.Struct({
  operations: Schema.Array(
    Schema.extend(
      MemberFlagSchema.omit('granted_at', 'granted_by', 'expires_at'),
      Schema.Struct({ expires_at: Schema.optional(Schema.String) })
    )
  ),
});
