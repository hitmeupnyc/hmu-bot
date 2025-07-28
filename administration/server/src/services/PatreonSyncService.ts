import patreon from 'patreon';
import { DatabaseService } from './DatabaseService';
import { Member, SyncOperation, ExternalIntegration, MemberMembership } from '../types';
import crypto from 'crypto';

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

export class PatreonSyncService {
  private patreonAPI: any;
  private patreonOAuth: any;
  private db: DatabaseService;

  constructor() {
    const clientId = process.env.PATREON_CLIENT_ID || '';
    const clientSecret = process.env.PATREON_CLIENT_SECRET || '';
    
    this.patreonAPI = patreon.patreon;
    this.patreonOAuth = patreon.oauth(clientId, clientSecret);
    this.db = DatabaseService.getInstance();
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
      member = await this.updateExistingMember(existingMember, patron);
    } else {
      member = await this.createMemberFromPatron(patron);
    }

    // Update external integration
    await this.upsertExternalIntegration(member.id, patron);

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

    // Update professional affiliate status if this is a higher tier
    if (pledge.attributes.amount_cents >= 1000) { // $10+ = professional affiliate
      await this.updateMemberFlag(memberId, 2, true); // Set professional affiliate flag
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

    const expectedSignature = crypto
      .createHmac('md5', secret)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  }

  private async findMemberByEmail(email: string): Promise<Member | null> {
    const stmt = this.db.db.prepare('SELECT * FROM members WHERE email = ?');
    const member = stmt.get(email) as Member | undefined;
    return member || null;
  }

  private async updateExistingMember(existingMember: Member, patron: PatreonUser): Promise<Member> {
    const updateData: Partial<Member> = {};

    // Only update if Patreon has data and local data is missing
    if (patron.attributes.first_name && !existingMember.first_name) {
      updateData.first_name = patron.attributes.first_name;
    }
    if (patron.attributes.last_name && !existingMember.last_name) {
      updateData.last_name = patron.attributes.last_name;
    }

    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString();

      const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updateData);

      const stmt = this.db.db.prepare(`UPDATE members SET ${setClause} WHERE id = ?`);
      stmt.run(...values, existingMember.id);
    }

    return this.db.db.prepare('SELECT * FROM members WHERE id = ?').get(existingMember.id) as Member;
  }

  private async createMemberFromPatron(patron: PatreonUser): Promise<Member> {
    const memberData = {
      first_name: patron.attributes.first_name || 'Unknown',
      last_name: patron.attributes.last_name || 'Patron',
      email: patron.attributes.email,
      flags: patron.attributes.patron_status === 'active_patron' ? 3 : 1, // Active + Professional if active patron
      date_added: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const stmt = this.db.db.prepare(`
      INSERT INTO members (first_name, last_name, email, flags, date_added, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      memberData.first_name,
      memberData.last_name,
      memberData.email,
      memberData.flags,
      memberData.date_added,
      memberData.created_at,
      memberData.updated_at
    );

    return this.db.db.prepare('SELECT * FROM members WHERE id = ?').get(result.lastInsertRowid) as Member;
  }

  private async determineMembershipType(pledge: PatreonPledge, reward?: PatreonReward): Promise<number | null> {
    // This is a simplified mapping - you would create proper membership types
    // based on your Patreon reward tiers
    const amount = pledge.attributes.amount_cents;
    
    if (amount >= 2500) return 3; // Premium tier ($25+)
    if (amount >= 1000) return 2; // Professional tier ($10+)
    if (amount >= 500) return 1;  // Basic tier ($5+)
    
    return null; // Below minimum tier
  }

  private async updateMemberMembership(memberId: number, membershipTypeId: number, pledge: PatreonPledge): Promise<void> {
    // End any existing active memberships
    const endExistingStmt = this.db.db.prepare(`
      UPDATE member_memberships 
      SET end_date = ? 
      WHERE member_id = ? AND end_date IS NULL
    `);
    endExistingStmt.run(new Date().toISOString(), memberId);

    // Create new membership if pledge is active
    if (!pledge.attributes.declined_since) {
      const insertStmt = this.db.db.prepare(`
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

  private async updateMemberFlag(memberId: number, flag: number, value: boolean): Promise<void> {
    const member = this.db.db.prepare('SELECT flags FROM members WHERE id = ?').get(memberId) as { flags: number };
    
    let newFlags = member.flags;
    if (value) {
      newFlags |= flag; // Set flag
    } else {
      newFlags &= ~flag; // Unset flag
    }

    const stmt = this.db.db.prepare('UPDATE members SET flags = ?, updated_at = ? WHERE id = ?');
    stmt.run(newFlags, new Date().toISOString(), memberId);
  }

  private async upsertExternalIntegration(memberId: number, patron: PatreonUser): Promise<void> {
    const stmt = this.db.db.prepare(`
      INSERT OR REPLACE INTO external_integrations 
      (member_id, system_name, external_id, external_data_json, last_synced_at, flags)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      memberId,
      'patreon',
      patron.id,
      JSON.stringify(patron),
      new Date().toISOString(),
      1 // Active
    );
  }

  private async createSyncOperation(data: Omit<SyncOperation, 'id' | 'created_at'>): Promise<SyncOperation> {
    const stmt = this.db.db.prepare(`
      INSERT INTO sync_operations (platform, operation_type, external_id, member_id, status, payload_json, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.platform,
      data.operation_type,
      data.external_id,
      data.member_id || null,
      data.status,
      data.payload_json,
      data.error_message || null,
      new Date().toISOString()
    );

    return this.db.db.prepare('SELECT * FROM sync_operations WHERE id = ?').get(result.lastInsertRowid) as SyncOperation;
  }

  private async updateSyncOperation(id: number, status: string, message?: string, memberId?: number): Promise<void> {
    const stmt = this.db.db.prepare(`
      UPDATE sync_operations 
      SET status = ?, error_message = ?, member_id = ?, processed_at = ?
      WHERE id = ?
    `);

    stmt.run(status, message || null, memberId || null, new Date().toISOString(), id);
  }
}