import { Schema } from 'effect';

// Common audit logging schema
export const AuditLogEntrySchema = Schema.Struct({
  entityType: Schema.String,
  entityId: Schema.optional(Schema.Number),
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
  oldValues: Schema.optional(Schema.Object),
  newValues: Schema.optional(Schema.Object),
  metadata: Schema.optional(Schema.Object),
});

export type AuditLogEntry = typeof AuditLogEntrySchema.Type;

// Discord schemas
export const DiscordUserSchema = Schema.Struct({
  id: Schema.String,
  username: Schema.String,
  discriminator: Schema.String,
  email: Schema.optional(Schema.String),
  verified: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  avatar: Schema.optional(Schema.String),
  bot: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  global_name: Schema.optional(Schema.String),
});

export type DiscordUser = typeof DiscordUserSchema.Type;

export const DiscordGuildMemberSchema = Schema.Struct({
  user: DiscordUserSchema,
  nick: Schema.optional(Schema.String),
  roles: Schema.Array(Schema.String),
  joined_at: Schema.String,
  premium_since: Schema.optional(Schema.String),
  deaf: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  mute: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  pending: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  permissions: Schema.optional(Schema.String),
});

export type DiscordGuildMember = typeof DiscordGuildMemberSchema.Type;

export const DiscordWebhookPayloadSchema = Schema.Struct({
  guild_id: Schema.String,
  user_id: Schema.String,
  event_type: Schema.Union(
    Schema.Literal('member_join'),
    Schema.Literal('member_leave'),
    Schema.Literal('member_update'),
    Schema.Literal('role_update')
  ),
  member: Schema.optional(DiscordGuildMemberSchema),
  // old_member: Schema.optional(Schema.partial(DiscordGuildMemberSchema)),
});

export type DiscordWebhookPayload = typeof DiscordWebhookPayloadSchema.Type;

// Sync result schema
export const SyncResultSchema = Schema.Struct({
  synced: Schema.Number,
  errors: Schema.Number,
  details: Schema.optional(Schema.Array(Schema.String)),
});

export type SyncResult = typeof SyncResultSchema.Type;
