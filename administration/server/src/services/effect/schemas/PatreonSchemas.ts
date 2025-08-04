import { Schema } from 'effect';

export const PatreonUserSchema = Schema.Struct({
  id: Schema.String,
  type: Schema.Literal('user'),
  attributes: Schema.Struct({
    email: Schema.String,
    first_name: Schema.String,
    last_name: Schema.String,
    full_name: Schema.String,
    patron_status: Schema.optional(
      Schema.Union(
        Schema.Literal('active_patron'),
        Schema.Literal('declined_patron'),
        Schema.Literal('former_patron'),
        Schema.Null
      )
    ),
    is_email_verified: Schema.Boolean,
    created: Schema.String,
  }),
});

export type PatreonUser = typeof PatreonUserSchema.Type;

export const PatreonPledgeSchema = Schema.Struct({
  id: Schema.String,
  type: Schema.Literal('pledge'),
  attributes: Schema.Struct({
    amount_cents: Schema.Number,
    created_at: Schema.String,
    declined_since: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
    patron_pays_fees: Schema.Boolean,
    pledge_cap_cents: Schema.optional(Schema.Union(Schema.Number, Schema.Null)),
  }),
  relationships: Schema.Struct({
    patron: Schema.Struct({
      data: Schema.Struct({
        id: Schema.String,
        type: Schema.Literal('user'),
      }),
    }),
    reward: Schema.Struct({
      data: Schema.Struct({
        id: Schema.String,
        type: Schema.Literal('reward'),
      }),
    }),
  }),
});

export type PatreonPledge = typeof PatreonPledgeSchema.Type;

export const PatreonRewardSchema = Schema.Struct({
  id: Schema.String,
  type: Schema.Literal('reward'),
  attributes: Schema.Struct({
    title: Schema.String,
    description: Schema.String,
    amount_cents: Schema.Number,
    created_at: Schema.String,
    discord_role_ids: Schema.optional(Schema.Union(Schema.Array(Schema.String), Schema.Null)),
    edited_at: Schema.String,
    image_url: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
    patron_count: Schema.Number,
    published: Schema.Boolean,
    published_at: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
    remaining: Schema.optional(Schema.Union(Schema.Number, Schema.Null)),
    requires_shipping: Schema.Boolean,
    url: Schema.optional(Schema.Union(Schema.String, Schema.Null)),
    user_limit: Schema.optional(Schema.Union(Schema.Number, Schema.Null)),
  }),
});

export type PatreonReward = typeof PatreonRewardSchema.Type;

export const PatreonWebhookPayloadSchema = Schema.Struct({
  data: Schema.Union(PatreonUserSchema, PatreonPledgeSchema),
  included: Schema.optional(
    Schema.Array(Schema.Union(PatreonUserSchema, PatreonPledgeSchema, PatreonRewardSchema))
  ),
});

export type PatreonWebhookPayload = typeof PatreonWebhookPayloadSchema.Type;

export const PatreonConfigSchema = Schema.Struct({
  clientId: Schema.String,
  clientSecret: Schema.String,
  accessToken: Schema.optional(Schema.String),
  webhookSecret: Schema.String,
});

export type PatreonConfig = typeof PatreonConfigSchema.Type;

export const PatreonTokenResponseSchema = Schema.Struct({
  access_token: Schema.String,
  refresh_token: Schema.String,
  expires_in: Schema.Number,
  token_type: Schema.String,
  scope: Schema.String,
});

export type PatreonTokenResponse = typeof PatreonTokenResponseSchema.Type;
