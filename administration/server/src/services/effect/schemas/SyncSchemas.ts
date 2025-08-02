import { Schema } from 'effect';

export const SyncOperationSchema = Schema.Struct({
  id: Schema.optionalWith(Schema.Number, { default: () => 0 }),
  platform: Schema.String,
  operation_type: Schema.String,
  external_id: Schema.String,
  member_id: Schema.optional(Schema.Number),
  status: Schema.String,
  payload_json: Schema.String,
  error_message: Schema.optional(Schema.String),
  created_at: Schema.optionalWith(Schema.String, { default: () => new Date().toISOString() }),
  processed_at: Schema.optional(Schema.String),
});

export type SyncOperation = Schema.Schema.Type<typeof SyncOperationSchema>;

export const CreateSyncOperationSchema = SyncOperationSchema.pipe(Schema.omit('id', 'created_at'));
export type CreateSyncOperation = Schema.Schema.Type<typeof CreateSyncOperationSchema>;

export const MemberDataSchema = Schema.Struct({
  first_name: Schema.String,
  last_name: Schema.String,
  email: Schema.String,
  flags: Schema.optionalWith(Schema.Number, { default: () => 1 }),
  date_added: Schema.optionalWith(Schema.String, { default: () => new Date().toISOString() }),
});

export type MemberData = typeof MemberDataSchema.Type;

export const ExternalIntegrationSchema = Schema.Struct({
  member_id: Schema.Number,
  system_name: Schema.String,
  external_id: Schema.String,
  external_data_json: Schema.String,
  flags: Schema.optionalWith(Schema.Number, { default: () => 1 }),
  last_synced_at: Schema.optionalWith(Schema.String, { default: () => new Date().toISOString() }),
});

export type ExternalIntegration = typeof ExternalIntegrationSchema.Type;

export const HMACVerificationSchema = Schema.Struct({
  payload: Schema.String,
  signature: Schema.String,
  secret: Schema.String,
  algorithm: Schema.optionalWith(Schema.String, { default: () => 'sha256' }),
});

export type HMACVerification = typeof HMACVerificationSchema.Type;
