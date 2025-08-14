import crypto from 'crypto';
import { Effect, pipe } from 'effect';
import * as Schema from 'effect/Schema';
import {
  createBaseMember,
  createSyncOperation,
  findMemberByEmail,
  updateExistingMember,
  updateMemberFlag,
  updateSyncOperation,
  upsertExternalIntegration,
  verifyMD5Signature,
} from './BaseSyncEffects';
import { DatabaseService } from './context/DatabaseService';
import {
  PatreonAPIError,
  PatreonConfigError,
  PatreonOAuthError,
  PatreonSyncError,
  PatreonWebhookError,
} from './errors/PatreonErrors';
import { Member, MemberSchema } from './schemas/MemberSchemas';
import {
  PatreonConfigSchema,
  PatreonPledgeSchema,
  PatreonUserSchema,
  PatreonWebhookPayloadSchema,
  type PatreonPledge,
  type PatreonReward,
  type PatreonUser,
  type PatreonWebhookPayload,
} from './schemas/PatreonSchemas';

/**
 * Load Patreon configuration from environment
 */
export const loadPatreonConfig = () =>
  Effect.gen(function* () {
    const config = {
      clientId: process.env.PATREON_CLIENT_ID || '',
      clientSecret: process.env.PATREON_CLIENT_SECRET || '',
      accessToken: process.env.PATREON_ACCESS_TOKEN,
      webhookSecret: process.env.PATREON_WEBHOOK_SECRET || '',
    };

    if (!config.clientId) {
      return yield* new PatreonConfigError({
        message: 'PATREON_CLIENT_ID not configured',
        field: 'clientId',
      });
    }

    if (!config.clientSecret) {
      return yield* new PatreonConfigError({
        message: 'PATREON_CLIENT_SECRET not configured',
        field: 'clientSecret',
      });
    }

    if (!config.webhookSecret) {
      return yield* new PatreonConfigError({
        message: 'PATREON_WEBHOOK_SECRET not configured',
        field: 'webhookSecret',
      });
    }

    return yield* Schema.decodeUnknown(PatreonConfigSchema)(config);
  });

/**
 * Verify Patreon webhook signature
 */
export const verifyPatreonWebhookSignature = (
  payload: string,
  signature: string
) =>
  Effect.gen(function* () {
    const config = yield* loadPatreonConfig();

    const isValid = yield* verifyMD5Signature(
      payload,
      signature,
      config.webhookSecret
    );

    if (!isValid) {
      return yield* new PatreonWebhookError({
        message: 'Invalid webhook signature',
        payload,
      });
    }

    return true;
  });

/**
 * Determine membership type based on pledge amount
 */
const determineMembershipType = (
  pledge: PatreonPledge,
  reward?: PatreonReward
) =>
  Effect.sync(() => {
    const amount = pledge.attributes.amount_cents;

    // Example tier mapping - customize for your club
    if (amount >= 2500) return 3; // Tier 3 ($25+)
    if (amount >= 1000) return 2; // Tier 2 ($10+)
    if (amount >= 500) return 1; // Tier 1 ($5+)

    return null; // Below minimum tier
  });

/**
 * Update member membership based on pledge
 */
const updateMemberMembership = (
  memberId: number,
  membershipTypeId: number,
  pledge: PatreonPledge
) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    // End any existing active memberships
    yield* db.query(async (db) =>
      db
        .updateTable('member_memberships')
        .set({ end_date: new Date().toISOString() })
        .where('member_id', '=', memberId)
        .where('end_date', 'is', null)
        .execute()
    );

    // Create new membership if pledge is active
    if (!pledge.attributes.declined_since) {
      yield* db.query(async (db) =>
        db
          .insertInto('member_memberships')
          .values({
            member_id: memberId,
            membership_type_id: membershipTypeId,
            start_date: new Date().toISOString(),
            external_payment_reference: `patreon_pledge_${pledge.id}`,
          })
          .execute()
      );
    }
  });

/**
 * Create member from Patreon user data
 */
const createMemberFromPatron = (patron: PatreonUser) =>
  Effect.gen(function* () {
    const baseFlags = 1; // Active by default
    const statusFlags =
      patron.attributes.patron_status === 'active_patron' ? 2 : 0;

    return yield* createBaseMember({
      first_name: patron.attributes.first_name || 'Unknown',
      last_name: patron.attributes.last_name || 'Patron',
      email: patron.attributes.email,
      flags: baseFlags | statusFlags,
      date_added: new Date().toISOString(),
    });
  });

/**
 * Update existing member from Patreon data
 */
const updateExistingMemberFromPatron = (
  existingMember: Member,
  patron: PatreonUser
) =>
  Effect.gen(function* () {
    const updates = {
      first_name: patron.attributes.first_name,
      last_name: patron.attributes.last_name,
    };

    return yield* updateExistingMember(existingMember, updates);
  });

/**
 * Process a pledge for a specific member
 */
const processPledgeForMember = (
  memberId: number,
  pledge: PatreonPledge,
  included: Array<PatreonUser | PatreonPledge | PatreonReward> = []
) =>
  Effect.gen(function* () {
    // Find the reward tier for this pledge
    const reward = included.find(
      (item) =>
        item.type === 'reward' &&
        item.id === pledge.relationships.reward.data.id
    ) as PatreonReward | undefined;

    // Determine membership type based on pledge amount or reward tier
    const membershipTypeId = yield* determineMembershipType(pledge, reward);

    if (membershipTypeId) {
      yield* updateMemberMembership(memberId, membershipTypeId, pledge);
    }

    // Update member status based on pledge amount
    if (pledge.attributes.amount_cents >= 1000) {
      // $10+ gets special status
      yield* updateMemberFlag(memberId, 2, true); // Set special status flag
    }
  });

/**
 * Sync a Patreon patron to our member database
 */
export const syncPatron = (
  patron: PatreonUser,
  included: Array<PatreonUser | PatreonPledge | PatreonReward> = [],
  syncOperationId: number
) =>
  Effect.gen(function* () {
    const validatedPatron =
      yield* Schema.decodeUnknown(PatreonUserSchema)(patron);

    if (!validatedPatron.attributes.email) {
      yield* updateSyncOperation(
        syncOperationId,
        'failed',
        'No email in patron data'
      );
      return null;
    }

    // Check if member exists by email
    const existingMember = yield* findMemberByEmail(
      validatedPatron.attributes.email
    );
    const vExistingMember =
      yield* Schema.decodeUnknown(MemberSchema)(existingMember);
    let member: Member;

    if (existingMember) {
      let m = yield* updateExistingMemberFromPatron(
        vExistingMember,
        validatedPatron
      );
      member = yield* Schema.decodeUnknown(MemberSchema)(m);
    } else {
      let m = yield* createMemberFromPatron(validatedPatron);
      member = yield* Schema.decodeUnknown(MemberSchema)(m);
    }

    // Update external integration
    yield* upsertExternalIntegration(
      member.id,
      'patreon',
      validatedPatron.id,
      validatedPatron
    );

    // Process any included pledges for this patron
    const patronPledges = included.filter(
      (item) =>
        item.type === 'pledge' &&
        (item as PatreonPledge).relationships?.patron?.data?.id ===
          validatedPatron.id
    ) as PatreonPledge[];

    yield* Effect.forEach(
      patronPledges,
      (pledge) => processPledgeForMember(member.id, pledge, included),
      { concurrency: 3 }
    );

    yield* updateSyncOperation(
      syncOperationId,
      'success',
      'Patron synced',
      member.id
    );
    return member;
  }).pipe(
    Effect.mapError((error) =>
      error._tag === 'ParseError'
        ? new PatreonSyncError({
            message: `Patron validation failed: ${error.message}`,
            patronId: patron.id,
            operation: 'syncPatron',
          })
        : error
    )
  );

/**
 * Sync a Patreon pledge
 */
export const syncPledge = (
  pledge: PatreonPledge,
  included: Array<PatreonUser | PatreonPledge | PatreonReward> = [],
  syncOperationId: number
) =>
  Effect.gen(function* () {
    const validatedPledge =
      yield* Schema.decodeUnknown(PatreonPledgeSchema)(pledge);

    // Find the patron for this pledge
    const patron = included.find(
      (item) =>
        item.type === 'user' &&
        item.id === validatedPledge.relationships.patron.data.id
    ) as PatreonUser | undefined;

    if (!patron) {
      yield* updateSyncOperation(
        syncOperationId,
        'failed',
        'No patron data in pledge webhook'
      );
      return;
    }

    // Sync the patron first
    const member = yield* syncPatron(patron, included, syncOperationId);

    if (member) {
      yield* processPledgeForMember(member.id, validatedPledge, included);
      yield* updateSyncOperation(
        syncOperationId,
        'success',
        'Pledge synced',
        member.id
      );
    }
  }).pipe(
    Effect.mapError((error) =>
      error._tag === 'ParseError'
        ? new PatreonSyncError({
            message: `Pledge validation failed: ${error.message}`,
            patronId: pledge.id,
            operation: 'syncPledge',
          })
        : error
    )
  );

/**
 * Handle incoming Patreon webhook
 */
export const handlePatreonWebhook = (
  payload: PatreonWebhookPayload,
  signature: string
) =>
  Effect.gen(function* () {
    const validatedPayload = yield* Schema.decodeUnknown(
      PatreonWebhookPayloadSchema
    )(payload);

    // Verify webhook signature
    yield* verifyPatreonWebhookSignature(JSON.stringify(payload), signature);

    const { data } = validatedPayload;

    const syncOperation = yield* createSyncOperation({
      platform: 'patreon',
      operation_type: 'webhook',
      external_id: data.id,
      status: 'pending',
      payload_json: JSON.stringify(validatedPayload),
    });

    const result = yield* pipe(
      Effect.gen(function* () {
        if (data.type === 'user') {
          return yield* syncPatron(
            data as PatreonUser,
            [...(validatedPayload.included || [])],
            syncOperation.id
          );
        } else if (data.type === 'pledge') {
          yield* syncPledge(
            data as PatreonPledge,
            [...(validatedPayload.included || [])],
            syncOperation.id
          );
          return 'pledge_processed';
        }
        return null;
      }),
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
  }).pipe(
    Effect.mapError((error) =>
      error._tag === 'ParseError'
        ? new PatreonWebhookError({
            message: `Webhook payload validation failed: ${error.message}`,
            payload: JSON.stringify(payload),
          })
        : error
    )
  );

/**
 * Generate OAuth URL for Patreon authentication
 */
export const getPatreonOAuthURL = (redirectUri: string, state?: string) =>
  Effect.gen(function* () {
    const config = yield* loadPatreonConfig();
    const actualState = state || crypto.randomBytes(16).toString('hex');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: redirectUri,
      scope: 'identity campaigns w:campaigns.webhook',
      state: actualState,
    });

    return `https://www.patreon.com/oauth2/authorize?${params.toString()}`;
  });

/**
 * Exchange OAuth code for access token (mock implementation)
 */
export const exchangePatreonOAuthCode = (code: string, redirectUri: string) =>
  Effect.gen(function* () {
    const config = yield* loadPatreonConfig();

    // This would typically make an HTTP request to Patreon's token endpoint
    // For now, we'll return a mock implementation
    return yield* Effect.tryPromise({
      try: async () => {
        // Mock API call - replace with actual HTTP request
        const response = await fetch(
          'https://www.patreon.com/api/oauth2/token',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              code,
              grant_type: 'authorization_code',
              client_id: config.clientId,
              client_secret: config.clientSecret,
              redirect_uri: redirectUri,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`OAuth exchange failed: ${response.statusText}`);
        }

        return await response.json();
      },
      catch: (error) =>
        new PatreonOAuthError({
          message: `Failed to exchange OAuth code: ${String(error)}`,
          code,
        }),
    });
  });

/**
 * Bulk sync all patrons from Patreon
 */
export const bulkSyncPatreons = (campaignId: string) =>
  Effect.gen(function* () {
    const config = yield* loadPatreonConfig();

    if (!config.accessToken) {
      return yield* new PatreonConfigError({
        message: 'Access token required for bulk sync',
        field: 'accessToken',
      });
    }

    // Mock API call - replace with actual Patreon API client
    const pledgesData = yield* Effect.tryPromise({
      try: async () => {
        // This would use the actual Patreon API client
        // For now, return mock data structure
        return {
          data: [] as PatreonPledge[],
          included: [] as Array<PatreonUser | PatreonPledge | PatreonReward>,
        };
      },
      catch: (error) =>
        new PatreonAPIError({
          message: `Failed to fetch campaign pledges: ${String(error)}`,
          operation: 'bulkSync',
        }),
    });

    let synced = 0;
    let errors = 0;

    const results = yield* Effect.forEach(
      pledgesData.data,
      (pledge) =>
        Effect.gen(function* () {
          const syncOperation = yield* createSyncOperation({
            platform: 'patreon',
            operation_type: 'bulk_sync',
            external_id: pledge.id,
            status: 'pending',
            payload_json: JSON.stringify({
              data: pledge,
              included: pledgesData.included,
            }),
          });

          return yield* pipe(
            syncPledge(pledge, pledgesData.included, syncOperation.id),
            Effect.match({
              onFailure: () => ({ success: false, pledgeId: pledge.id }),
              onSuccess: () => ({ success: true, pledgeId: pledge.id }),
            })
          );
        }),
      { concurrency: 10 }
    );

    synced = results.filter((r) => r.success).length;
    errors = results.filter((r) => !r.success).length;

    return { synced, errors };
  });
