import { Schema } from 'effect';

export const AuditSchema = Schema.Struct({
  entity_type: Schema.String,
  entity_id: Schema.optional(Schema.Number),
  action: Schema.Union(
    Schema.Literal('create'),
    Schema.Literal('update'),
    Schema.Literal('delete'),
    Schema.Literal('view'),
    Schema.Literal('search'),
    Schema.Literal('note')
  ),
  userSessionId: Schema.optional(Schema.String),
  userIp: Schema.optional(Schema.String),
  userEmail: Schema.optional(Schema.String),
  userId: Schema.optional(Schema.String),
  oldValues: Schema.optional(Schema.Object),
  newValues: Schema.optional(Schema.Object),
  metadata: Schema.optional(Schema.Object),
});

export type Audit = typeof AuditSchema.Type;
