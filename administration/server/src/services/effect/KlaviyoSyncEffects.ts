import { Effect } from 'effect';
import * as Schema from 'effect/Schema';
import {
  createBaseMember,
  createSyncOperation,
  findMemberByEmail,
  updateExistingMember,
  updateMemberFlag,
  updateSyncOperation,
  upsertExternalIntegration,
} from './BaseSyncEffects';
import { SyncResultSchema } from './schemas/CommonSchemas';

/**
 * Klaviyo profile schema
 */
const KlaviyoProfileSchema = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  first_name: Schema.optional(Schema.String),
  last_name: Schema.optional(Schema.String),
  phone_number: Schema.optional(Schema.String),
  location: Schema.optional(Schema.String),
  properties: Schema.optional(Schema.String),
  consents: Schema.optional(Schema.String),
});

type KlaviyoProfile = typeof KlaviyoProfileSchema.Type;

/**
 * Klaviyo webhook payload schema
 */
const KlaviyoWebhookPayloadSchema = Schema.Struct({
  event_type: Schema.String,
  profile: KlaviyoProfileSchema,
  event_properties: Schema.optional(Schema.String),
  timestamp: Schema.String,
});

type KlaviyoWebhookPayload = typeof KlaviyoWebhookPayloadSchema.Type;

/**
 * Load Klaviyo configuration
 */
const loadKlaviyoConfig = () =>
  Effect.gen(function* () {
    const apiKey = process.env.KLAVIYO_API_KEY;
    const webhookSecret = process.env.KLAVIYO_WEBHOOK_SECRET;

    if (!apiKey) {
      return yield* Effect.fail(new Error('Klaviyo API key not configured'));
    }

    return { apiKey, webhookSecret };
  });

/**
 * Create member from Klaviyo profile
 */
const createMemberFromKlaviyoProfile = (profile: KlaviyoProfile) =>
  Effect.gen(function* () {
    return yield* createBaseMember({
      first_name: profile.first_name || 'Unknown',
      last_name: profile.last_name || 'Subscriber',
      email: profile.email,
      flags: 1, // Active by default
      date_added: new Date().toISOString(),
    });
  });

/**
 * Sync Klaviyo profile to member database
 */
export const syncKlaviyoProfile = (
  profile: KlaviyoProfile,
  syncOperationId: number
) =>
  Effect.gen(function* () {
    const validatedProfile =
      yield* Schema.decodeUnknown(KlaviyoProfileSchema)(profile);

    // Look for existing member by email
    let member = yield* findMemberByEmail(validatedProfile.email);

    if (member) {
      // Update existing member with Klaviyo data
      const updates = {
        first_name: validatedProfile.first_name,
        last_name: validatedProfile.last_name,
      };
      member = yield* updateExistingMember(member, updates);
    } else {
      // Create new member
      member = yield* createMemberFromKlaviyoProfile(validatedProfile);
    }

    // Update Klaviyo integration
    yield* upsertExternalIntegration(
      member.id,
      'klaviyo',
      validatedProfile.id,
      {
        email: validatedProfile.email,
        phone_number: validatedProfile.phone_number,
        location: validatedProfile.location,
        properties: validatedProfile.properties,
        consents: validatedProfile.consents,
      }
    );

    // Set email marketing flag
    yield* updateMemberFlag(member.id, 8, true); // Email subscriber flag

    yield* updateSyncOperation(
      syncOperationId,
      'success',
      'Klaviyo profile synced',
      member.id
    );
    return member;
  });

/**
 * Handle Klaviyo webhook
 */
export const handleKlaviyoWebhook = (payload: KlaviyoWebhookPayload) =>
  Effect.gen(function* () {
    const validatedPayload = yield* Schema.decodeUnknown(
      KlaviyoWebhookPayloadSchema
    )(payload);

    const syncOperation = yield* createSyncOperation({
      platform: 'klaviyo',
      operation_type: 'webhook',
      external_id: validatedPayload.profile.id,
      status: 'pending',
      payload_json: JSON.stringify(validatedPayload),
    });

    const result = yield* Effect.gen(function* () {
      // Handle different Klaviyo events
      switch (validatedPayload.event_type) {
        case 'profile.created':
        case 'profile.updated':
          return yield* syncKlaviyoProfile(
            validatedPayload.profile,
            syncOperation.id
          );

        case 'profile.unsubscribed': {
          // Handle unsubscribe
          const member = yield* findMemberByEmail(
            validatedPayload.profile.email
          );
          if (member) {
            yield* updateMemberFlag(member.id, 8, false); // Remove email subscriber flag
            yield* updateSyncOperation(
              syncOperation.id,
              'success',
              'Profile unsubscribed'
            );
          }
          break;
        }

        default:
          yield* updateSyncOperation(
            syncOperation.id,
            'skipped',
            `Unknown event type: ${validatedPayload.event_type}`
          );
      }

      return null;
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* updateSyncOperation(
            syncOperation.id,
            'failed',
            error instanceof Error ? error.message : 'Unknown error'
          );
          return yield* Effect.fail(error);
        })
      )
    );

    return result;
  });

/**
 * Bulk sync Klaviyo profiles (mock implementation)
 */
export const bulkSyncKlaviyoProfiles = () =>
  Effect.gen(function* () {
    const config = yield* loadKlaviyoConfig();

    // This would typically make API calls to Klaviyo to fetch profiles
    // For now, we'll return a mock implementation
    const mockProfiles: KlaviyoProfile[] = [];

    let synced = 0;
    let errors = 0;

    const results = yield* Effect.forEach(
      mockProfiles,
      (profile) =>
        Effect.gen(function* () {
          const syncOperation = yield* createSyncOperation({
            platform: 'klaviyo',
            operation_type: 'bulk_sync',
            external_id: profile.id,
            status: 'pending',
            payload_json: JSON.stringify(profile),
          });

          return yield* Effect.match(
            syncKlaviyoProfile(profile, syncOperation.id),
            {
              onFailure: () => ({ success: false, profileId: profile.id }),
              onSuccess: () => ({ success: true, profileId: profile.id }),
            }
          );
        }),
      { concurrency: 10 }
    );

    synced = results.filter((r) => r.success).length;
    errors = results.filter((r) => !r.success).length;

    return yield* Schema.decodeUnknown(SyncResultSchema)({ synced, errors });
  });
