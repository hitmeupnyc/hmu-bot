import crypto from 'crypto';
import { Effect, pipe } from 'effect';
import * as Schema from 'effect/Schema';
import * as JobSchedulerEffects from './JobSchedulerEffects';

/**
 * Webhook verification error
 */
export class WebhookVerificationError {
  readonly _tag = 'WebhookVerificationError';
  constructor(
    readonly message: string,
    readonly platform: string
  ) {}
}

/**
 * Generic webhook payload schema
 */
export const WebhookPayloadSchema = Schema.Struct({
  action: Schema.optional(Schema.String),
  data: Schema.optional(Schema.Unknown),
});

export type WebhookPayload = typeof WebhookPayloadSchema.Type;

/**
 * Verify Eventbrite webhook signature
 */
const verifyEventbriteSignature = (
  payload: unknown,
  signature?: string
): Effect.Effect<void, WebhookVerificationError> =>
  Effect.gen(function* () {
    const secret = process.env.EVENTBRITE_WEBHOOK_SECRET;

    if (!secret) {
      console.warn('Eventbrite webhook secret not configured, skipping verification');
      return;
    }

    if (!signature) {
      return yield* Effect.fail(new WebhookVerificationError('Missing webhook signature', 'eventbrite'));
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== expectedSignature) {
      return yield* Effect.fail(new WebhookVerificationError('Invalid webhook signature', 'eventbrite'));
    }
  });

/**
 * Verify Patreon webhook signature
 */
const verifyPatreonSignature = (
  payload: unknown,
  signature?: string
): Effect.Effect<void, WebhookVerificationError> =>
  Effect.gen(function* () {
    const secret = process.env.PATREON_WEBHOOK_SECRET;

    if (!secret) {
      console.warn('Patreon webhook secret not configured, skipping verification');
      return;
    }

    if (!signature) {
      return yield* Effect.fail(new WebhookVerificationError('Missing webhook signature', 'patreon'));
    }

    const expectedSignature = crypto
      .createHmac('md5', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== expectedSignature) {
      return yield* Effect.fail(new WebhookVerificationError('Invalid webhook signature', 'patreon'));
    }
  });

/**
 * Verify Klaviyo webhook signature
 */
const verifyKlaviyoSignature = (
  payload: unknown,
  signature?: string
): Effect.Effect<void, WebhookVerificationError> =>
  Effect.gen(function* () {
    const secret = process.env.KLAVIYO_WEBHOOK_SECRET;

    if (!secret) {
      console.warn('Klaviyo webhook secret not configured, skipping verification');
      return;
    }

    if (!signature) {
      return yield* Effect.fail(new WebhookVerificationError('Missing webhook signature', 'klaviyo'));
    }

    // Klaviyo uses HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('base64');

    if (signature !== expectedSignature) {
      return yield* Effect.fail(new WebhookVerificationError('Invalid webhook signature', 'klaviyo'));
    }
  });

/**
 * Handle Eventbrite webhook
 */
export const handleEventbriteWebhook = (
  payload: unknown,
  headers: Record<string, any>
) =>
  Effect.gen(function* () {
    // Verify webhook signature
    yield* verifyEventbriteSignature(payload, headers['x-eventbrite-signature']);

    // Queue the webhook for async processing
    yield* JobSchedulerEffects.queueWebhook({
      platform: 'eventbrite',
      eventType: (payload as any)?.action || 'webhook',
      payload,
      timestamp: new Date().toISOString(),
    });

    console.log('Eventbrite webhook queued for processing:', (payload as any)?.action);
    
    return { success: true, message: 'Webhook queued for processing' };
  });

/**
 * Handle Patreon webhook
 */
export const handlePatreonWebhook = (
  payload: unknown,
  headers: Record<string, any>
) =>
  Effect.gen(function* () {
    // Verify webhook signature
    yield* verifyPatreonSignature(payload, headers['x-patreon-signature']);

    // Queue the webhook for async processing
    yield* JobSchedulerEffects.queueWebhook({
      platform: 'patreon',
      eventType: (payload as any)?.data?.type || 'webhook',
      payload,
      signature: headers['x-patreon-signature'],
      timestamp: new Date().toISOString(),
    });

    console.log('Patreon webhook queued for processing:', (payload as any)?.data?.type);
    
    return { success: true, message: 'Webhook queued for processing' };
  });

/**
 * Handle Klaviyo webhook
 */
export const handleKlaviyoWebhook = (
  payload: unknown,
  headers: Record<string, any>
) =>
  Effect.gen(function* () {
    // Verify webhook signature
    yield* verifyKlaviyoSignature(payload, headers['x-klaviyo-signature']);

    // Queue the webhook for async processing
    yield* JobSchedulerEffects.queueWebhook({
      platform: 'klaviyo',
      eventType: 'profile_update',
      payload,
      timestamp: new Date().toISOString(),
    });

    console.log('Klaviyo webhook queued for processing');
    
    return { success: true, message: 'Webhook queued for processing' };
  });