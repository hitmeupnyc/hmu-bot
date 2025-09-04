import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi,
} from '@effect/platform';
import { Schema } from 'effect';
import { DatabaseError, ParseError } from '~/api/errors';

// Audit log schema based on database structure
const AuditLogSchema = Schema.Struct({
  id: Schema.optional(Schema.Number),
  entity_type: Schema.String,
  entity_id: Schema.optional(Schema.Number),
  action: Schema.String,
  user_session_id: Schema.optional(Schema.String),
  user_id: Schema.optional(Schema.String),
  user_email: Schema.optional(Schema.String),
  user_ip: Schema.optional(Schema.String),
  old_values_json: Schema.optional(Schema.String),
  old_values: Schema.optional(Schema.Object),
  new_values_json: Schema.optional(Schema.String),
  new_values: Schema.optional(Schema.Object),
  metadata_json: Schema.optional(Schema.String),
  metadata: Schema.optional(Schema.Object),
  created_at: Schema.optional(Schema.String),
});

// Query parameters for listing audit logs
const AuditQuerySchema = Schema.Struct({
  entity_type: Schema.optional(Schema.String),
  entity_id: Schema.optional(Schema.NumberFromString),
  limit: Schema.optional(Schema.NumberFromString),
  offset: Schema.optional(Schema.NumberFromString),
});

// Audit API group
export const auditGroup = HttpApiGroup.make('audit').add(
  HttpApiEndpoint.get('api.audit.list', '/api/audit')
    .addSuccess(
      Schema.Struct({
        data: Schema.Array(AuditLogSchema),
        total: Schema.Number,
        limit: Schema.Number,
        offset: Schema.Number,
      })
    )
    .addError(DatabaseError)
    .addError(ParseError)
    .setUrlParams(AuditQuerySchema)
    .annotate(OpenApi.Summary, 'List audit logs')
    .annotate(
      OpenApi.Description,
      'Retrieve audit logs with optional filtering by entity type and ID'
    )
);

// Audit API
export const auditApi = HttpApi.make('AuditAPI').add(auditGroup);
