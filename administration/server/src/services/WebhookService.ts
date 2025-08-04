import { Effect } from 'effect';
import { AppError } from '../middleware/errorHandler';
import { DatabaseLive } from './effect/layers/DatabaseLayer';
import * as JobSchedulerEffects from './effect/JobSchedulerEffects';
import * as BaseSyncEffects from './effect/BaseSyncEffects';
import crypto from 'crypto';

export class WebhookService {
  public async handleEventbriteWebhook(payload: any, headers: Record<string, any>): Promise<void> {
    // Verify webhook signature
    this.verifyEventbriteSignature(payload, headers);

    // Queue the webhook for async processing using Effect
    await Effect.runPromise(
      JobSchedulerEffects.queueWebhook({
        platform: 'eventbrite',
        eventType: payload.action || 'webhook',
        payload,
        timestamp: new Date().toISOString(),
      }).pipe(Effect.provide(DatabaseLive))
    );

    console.log('Eventbrite webhook queued for processing:', payload.action);
  }

  public async handlePatreonWebhook(payload: any, headers: Record<string, any>): Promise<void> {
    // Verify webhook signature
    this.verifyPatreonSignature(payload, headers);

    // Queue the webhook for async processing using Effect
    await Effect.runPromise(
      JobSchedulerEffects.queueWebhook({
        platform: 'patreon',
        eventType: payload.data?.type || 'webhook',
        payload,
        signature: headers['x-patreon-signature'],
        timestamp: new Date().toISOString(),
      }).pipe(Effect.provide(DatabaseLive))
    );

    console.log('Patreon webhook queued for processing:', payload.data?.type);
  }

  public async handleKlaviyoWebhook(payload: any, headers: Record<string, any>): Promise<void> {
    // Verify webhook signature
    this.verifyKlaviyoSignature(payload, headers);

    // Queue the webhook for async processing using Effect
    await Effect.runPromise(
      JobSchedulerEffects.queueWebhook({
        platform: 'klaviyo',
        eventType: 'profile_update',
        payload,
        timestamp: new Date().toISOString(),
      }).pipe(Effect.provide(DatabaseLive))
    );

    console.log('Klaviyo webhook queued for processing');
  }

  private verifyEventbriteSignature(payload: any, headers: Record<string, any>): void {
    const signature = headers['x-eventbrite-signature'];
    const secret = process.env.EVENTBRITE_WEBHOOK_SECRET;

    if (!secret) {
      console.warn('Eventbrite webhook secret not configured, skipping verification');
      return;
    }

    if (!signature) {
      throw new AppError('Missing webhook signature', 401);
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new AppError('Invalid webhook signature', 401);
    }
  }

  private verifyPatreonSignature(payload: any, headers: Record<string, any>): void {
    const signature = headers['x-patreon-signature'];
    const secret = process.env.PATREON_WEBHOOK_SECRET;

    if (!secret) {
      console.warn('Patreon webhook secret not configured, skipping verification');
      return;
    }

    if (!signature) {
      throw new AppError('Missing webhook signature', 401);
    }

    const expectedSignature = crypto
      .createHmac('md5', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new AppError('Invalid webhook signature', 401);
    }
  }

  private verifyKlaviyoSignature(payload: any, headers: Record<string, any>): void {
    const signature = headers['x-klaviyo-signature'];
    const secret = process.env.KLAVIYO_WEBHOOK_SECRET;

    if (!secret) {
      console.warn('Klaviyo webhook secret not configured, skipping verification');
      return;
    }

    if (!signature) {
      throw new AppError('Missing webhook signature', 401);
    }

    // Klaviyo uses HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('base64');

    if (signature !== expectedSignature) {
      throw new AppError('Invalid webhook signature', 401);
    }
  }

  // Removed queueWebhookProcessing - now using JobSchedulerEffects.queueWebhook
}
