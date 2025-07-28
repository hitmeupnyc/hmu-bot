import patreon from 'patreon';
import { BaseSyncService } from './BaseSyncService';
import { Member } from '../types';
import crypto from 'crypto';
import { logSyncOperation } from '../utils/logger';

export interface PatreonUser {
  id: string;
  type: 'user';
  attributes: {
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    patron_status: 'active_patron' | 'declined_patron' | 'former_patron' | null;
    is_email_verified: boolean;
    created: string;
  };
}

export interface PatreonPledge {
  id: string;
  type: 'pledge';
  attributes: {
    amount_cents: number;
    created_at: string;
    declined_since: string | null;
    patron_pays_fees: boolean;
    pledge_cap_cents: number | null;
  };
  relationships: {
    patron: {
      data: {
        id: string;
        type: 'user';
      };
    };
    reward: {
      data: {
        id: string;
        type: 'reward';
      };
    };
  };
}

export interface PatreonReward {
  id: string;
  type: 'reward';
  attributes: {
    title: string;
    description: string;
    amount_cents: number;
    created_at: string;
    discord_role_ids: string[] | null;
    edited_at: string;
    image_url: string | null;
    patron_count: number;
    published: boolean;
    published_at: string | null;
    remaining: number | null;
    requires_shipping: boolean;
    url: string | null;
    user_limit: number | null;
  };
}

export interface PatreonWebhookPayload {
  data: PatreonUser | PatreonPledge;
  included?: Array<PatreonUser | PatreonPledge | PatreonReward>;
}

export class PatreonSyncService extends BaseSyncService {
  private patreonAPI: any;
  private patreonOAuth: any;

  constructor() {
    super();
    const clientId = process.env.PATREON_CLIENT_ID || '';
    const clientSecret = process.env.PATREON_CLIENT_SECRET || '';
    
    // Temporarily disable Patreon API to avoid build errors
    if (patreon && patreon.patreon) {
      this.patreonAPI = patreon.patreon;
      this.patreonOAuth = patreon.oauth(clientId, clientSecret);
    } else {
      console.warn('Patreon API not configured properly - sync will be disabled');
      this.patreonAPI = null as any;
      this.patreonOAuth = null as any;
    }
  }

  /**
   * Handle incoming Patreon webhook
   */
  async handleWebhook(payload: PatreonWebhookPayload, signature: string): Promise<void> {
    // Verify webhook signature
    if (!this.verifyWebhookSignature(JSON.stringify(payload), signature)) {
      throw new Error('Invalid webhook signature');
    }

    const { data } = payload;
    
    const syncOperation = await this.createSyncOperation({
      platform: 'patreon',
      operation_type: 'webhook',
      external_id: data.id,
      status: 'pending',
      payload_json: JSON.stringify(payload)
    });

    try {
      if (data.type === 'user') {
        await this.syncPatron(data as PatreonUser, payload.included, syncOperation.id);
      } else if (data.type === 'pledge') {
        await this.syncPledge(data as PatreonPledge, payload.included, syncOperation.id);
      }
    } catch (error) {
      await this.updateSyncOperation(
        syncOperation.id,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  /**
   * Sync a Patreon patron to our member database
   */
  async syncPatron(
    patron: PatreonUser, 
    included: Array<PatreonUser | PatreonPledge | PatreonReward> = [],
    syncOperationId: number
  ): Promise<Member | null> {
    if (!patron.attributes.email) {
      await this.updateSyncOperation(syncOperationId, 'failed', 'No email in patron data');
      return null;
    }

    // Check if member exists by email
    const existingMember = await this.findMemberByEmail(patron.attributes.email);
    let member: Member;

    if (existingMember) {
      member = await this.updateExistingMemberFromPatron(existingMember, patron);
    } else {
      member = await this.createMemberFromPatron(patron);
    }

    // Update external integration
    await this.upsertExternalIntegrationForPatron(member.id, patron);

    // Process any included pledges for this patron
    const patronPledges = included?.filter(item => 
      item.type === 'pledge' && 
      (item as PatreonPledge).relationships?.patron?.data?.id === patron.id
    ) as PatreonPledge[];

    for (const pledge of patronPledges || []) {
      await this.processPledgeForMember(member.id, pledge, included);
    }

    await this.updateSyncOperation(syncOperationId, 'success', 'Patron synced', member.id);
    return member;
  }

  /**
   * Sync a Patreon pledge
   */
  async syncPledge(
    pledge: PatreonPledge,
    included: Array<PatreonUser | PatreonPledge | PatreonReward> = [],
    syncOperationId: number
  ): Promise<void> {
    // Find the patron for this pledge
    const patron = included?.find(item => 
      item.type === 'user' && item.id === pledge.relationships.patron.data.id
    ) as PatreonUser;

    if (!patron) {
      await this.updateSyncOperation(syncOperationId, 'failed', 'No patron data in pledge webhook');
      return;
    }

    // Sync the patron first
    const member = await this.syncPatron(patron, included, syncOperationId);
    
    if (member) {
      await this.processPledgeForMember(member.id, pledge, included);
      await this.updateSyncOperation(syncOperationId, 'success', 'Pledge synced', member.id);
    }
  }

  /**
   * Process a pledge for a specific member
   */
  async processPledgeForMember(
    memberId: number,
    pledge: PatreonPledge,
    included: Array<PatreonUser | PatreonPledge | PatreonReward> = []
  ): Promise<void> {
    // Find the reward tier for this pledge
    const reward = included?.find(item =>
      item.type === 'reward' && item.id === pledge.relationships.reward.data.id
    ) as PatreonReward;

    // Determine membership type based on pledge amount or reward tier
    const membershipTypeId = await this.determineMembershipType(pledge, reward);
    
    if (membershipTypeId) {
      await this.updateMemberMembership(memberId, membershipTypeId, pledge);
    }

    // Placeholder: Update member status based on pledge amount
    if (pledge.attributes.amount_cents >= 1000) { // $10+ gets special status
      await this.updateMemberFlag(memberId, 2, true); // Set special status flag
      logSyncOperation.success('patreon', 'status_upgrade', pledge.id, memberId, {
        pledgeAmount: pledge.attributes.amount_cents,
        tier: 'special'
      });
    }
  }

  /**
   * Bulk sync all patrons from Patreon
   */
  async bulkSync(campaignId: string): Promise<{ synced: number; errors: number }> {
    let synced = 0;
    let errors = 0;

    try {
      // Get access token (this should be stored and refreshed properly)
      const accessToken = process.env.PATREON_ACCESS_TOKEN;
      if (!accessToken) {
        throw new Error('Patreon access token not configured');
      }

      const patreonAPIClient = this.patreonAPI(accessToken);

      // Fetch campaign pledges with patron data
      const pledgesResponse = await patreonAPIClient(`/campaigns/${campaignId}/pledges`, {
        fields: {
          pledge: ['amount_cents', 'created_at', 'declined_since', 'patron_pays_fees'],
          user: ['email', 'first_name', 'last_name', 'full_name', 'patron_status', 'created'],
          reward: ['title', 'description', 'amount_cents', 'patron_count']
        },
        include: 'patron,reward'
      });

      const pledges = pledgesResponse.data;
      const included = pledgesResponse.included || [];

      for (const pledge of pledges) {
        const syncOperation = await this.createSyncOperation({
          platform: 'patreon',
          operation_type: 'bulk_sync',
          external_id: pledge.id,
          status: 'pending',
          payload_json: JSON.stringify({ data: pledge, included })
        });

        try {
          await this.syncPledge(pledge, included, syncOperation.id);
          synced++;
        } catch (error) {
          await this.updateSyncOperation(
            syncOperation.id,
            'failed',
            error instanceof Error ? error.message : 'Unknown error'
          );
          errors++;
        }
      }

      return { synced, errors };
    } catch (error) {
      console.error('Patreon bulk sync error:', error);
      throw error;
    }
  }

  /**
   * Get OAuth URL for Patreon authentication
   */
  getOAuthURL(redirectUri: string, state?: string): string {
    return this.patreonOAuth.getOAuthURL({
      redirectURI: redirectUri,
      scope: 'identity campaigns w:campaigns.webhook',
      state: state || crypto.randomBytes(16).toString('hex')
    });
  }

  /**
   * Exchange OAuth code for access token
   */
  async getTokens(code: string, redirectUri: string): Promise<any> {
    return this.patreonOAuth.getTokens(code, redirectUri);
  }

  // Private helper methods
  private verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = process.env.PATREON_WEBHOOK_SECRET;
    if (!secret) return false;

    return this.verifyMD5Signature(payload, signature, secret);
  }


  private async updateExistingMemberFromPatron(existingMember: Member, patron: PatreonUser): Promise<Member> {
    const updates = {
      first_name: patron.attributes.first_name,
      last_name: patron.attributes.last_name
    };
    
    return await this.updateExistingMember(existingMember, updates);
  }

  private async createMemberFromPatron(patron: PatreonUser): Promise<Member> {
    // Placeholder: Determine initial member flags based on your business logic
    const baseFlags = 1; // Active by default
    const statusFlags = patron.attributes.patron_status === 'active_patron' ? 2 : 0; // Add status flag for active patrons
    
    return await this.createBaseMember({
      first_name: patron.attributes.first_name || 'Unknown',
      last_name: patron.attributes.last_name || 'Patron',
      email: patron.attributes.email,
      flags: baseFlags | statusFlags
    });
  }

  private async determineMembershipType(pledge: PatreonPledge, reward?: PatreonReward): Promise<number | null> {
    // Placeholder: Configure membership tiers based on your club's structure
    const amount = pledge.attributes.amount_cents;
    
    // Example tier mapping - customize for your club
    if (amount >= 2500) return 3; // Tier 3 ($25+)
    if (amount >= 1000) return 2; // Tier 2 ($10+)
    if (amount >= 500) return 1;  // Tier 1 ($5+)
    
    logSyncOperation.success('patreon', 'tier_determination', pledge.id, undefined, {
      pledgeAmount: amount,
      determinedTier: amount >= 2500 ? 3 : amount >= 1000 ? 2 : amount >= 500 ? 1 : null
    });
    
    return null; // Below minimum tier
  }

  private async updateMemberMembership(memberId: number, membershipTypeId: number, pledge: PatreonPledge): Promise<void> {
    // End any existing active memberships
    const endExistingStmt = this.db.prepare(`
      UPDATE member_memberships 
      SET end_date = ? 
      WHERE member_id = ? AND end_date IS NULL
    `);
    endExistingStmt.run(new Date().toISOString(), memberId);

    // Create new membership if pledge is active
    if (!pledge.attributes.declined_since) {
      const insertStmt = this.db.prepare(`
        INSERT INTO member_memberships (member_id, membership_type_id, start_date, external_payment_reference, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      insertStmt.run(
        memberId,
        membershipTypeId,
        new Date().toISOString(),
        `patreon_pledge_${pledge.id}`,
        new Date().toISOString()
      );
    }
  }


  private async upsertExternalIntegrationForPatron(memberId: number, patron: PatreonUser): Promise<void> {
    await this.upsertExternalIntegration(memberId, 'patreon', patron.id, patron, 1);
  }


}