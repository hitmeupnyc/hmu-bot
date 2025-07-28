import { ApiClient } from 'klaviyo-api';
import { DatabaseService } from './DatabaseService';
import { Member, SyncOperation, ExternalIntegration } from '../types';

export interface KlaviyoProfile {
  id: string;
  attributes: {
    email: string;
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    external_id?: string;
    properties?: Record<string, any>;
  };
}

export interface KlaviyoWebhookPayload {
  data: {
    type: string;
    id: string;
    attributes: {
      topic: string;
      payload: KlaviyoProfile;
    };
  };
}

export class KlaviyoSyncService {
  private client: ApiClient;
  private db: DatabaseService;

  constructor() {
    this.client = new ApiClient({
      apiKey: process.env.KLAVIYO_API_KEY || '',
    });
    this.db = DatabaseService.getInstance();
  }

  /**
   * Handle incoming Klaviyo webhook
   */
  async handleWebhook(payload: KlaviyoWebhookPayload): Promise<void> {
    const { topic, payload: profileData } = payload.data.attributes;
    
    const syncOperation = await this.createSyncOperation({
      platform: 'klaviyo',
      operation_type: 'webhook',
      external_id: profileData.id,
      status: 'pending',
      payload_json: JSON.stringify(payload)
    });

    try {
      switch (topic) {
        case 'profile.created':
        case 'profile.updated':
          await this.syncProfile(profileData, syncOperation.id);
          break;
        default:
          await this.updateSyncOperation(syncOperation.id, 'success', 'Webhook received but no action needed');
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
   * Sync a Klaviyo profile to our member database
   */
  async syncProfile(profile: KlaviyoProfile, syncOperationId: number): Promise<Member | null> {
    if (!profile.attributes.email) {
      await this.updateSyncOperation(syncOperationId, 'failed', 'No email in profile');
      return null;
    }

    // Check if member exists by email
    const existingMember = await this.findMemberByEmail(profile.attributes.email);
    
    if (existingMember) {
      // Update existing member
      const updatedMember = await this.updateExistingMember(existingMember, profile);
      await this.upsertExternalIntegration(updatedMember.id, profile);
      await this.updateSyncOperation(syncOperationId, 'success', 'Member updated', updatedMember.id);
      return updatedMember;
    } else {
      // Create new member
      const newMember = await this.createMemberFromProfile(profile);
      await this.upsertExternalIntegration(newMember.id, profile);
      await this.updateSyncOperation(syncOperationId, 'success', 'Member created', newMember.id);
      return newMember;
    }
  }

  /**
   * Bulk sync profiles from Klaviyo
   */
  async bulkSync(limit: number = 100): Promise<{ synced: number; errors: number }> {
    let synced = 0;
    let errors = 0;
    let cursor: string | undefined = undefined;

    try {
      do {
        const response = await this.client.Profiles.getProfiles({
          'page[size]': limit,
          'page[cursor]': cursor,
        });

        for (const profile of response.data) {
          const syncOperation = await this.createSyncOperation({
            platform: 'klaviyo',
            operation_type: 'bulk_sync',
            external_id: profile.id,
            status: 'pending',
            payload_json: JSON.stringify(profile)
          });

          try {
            await this.syncProfile(profile as KlaviyoProfile, syncOperation.id);
            synced++;
          } catch (error) {
            errors++;
            console.error(`Error syncing Klaviyo profile ${profile.id}:`, error);
          }
        }

        cursor = response.links?.next ? this.extractCursor(response.links.next) : undefined;
      } while (cursor);

      return { synced, errors };
    } catch (error) {
      console.error('Klaviyo bulk sync error:', error);
      throw error;
    }
  }

  /**
   * Get profile from Klaviyo by email
   */
  async getProfileByEmail(email: string): Promise<KlaviyoProfile | null> {
    try {
      const response = await this.client.Profiles.getProfiles({
        filter: `equals(email,"${email}")`,
      });

      return response.data.length > 0 ? response.data[0] as KlaviyoProfile : null;
    } catch (error) {
      console.error(`Error fetching Klaviyo profile for ${email}:`, error);
      return null;
    }
  }

  /**
   * Push member data to Klaviyo
   */
  async pushMemberToKlaviyo(member: Member): Promise<void> {
    try {
      const profileData = {
        data: {
          type: 'profile',
          attributes: {
            email: member.email,
            first_name: member.first_name,
            last_name: member.last_name,
            properties: {
              club_member_id: member.id,
              club_flags: member.flags,
              is_professional_affiliate: !!(member.flags & 2),
              club_member_since: member.date_added,
            }
          }
        }
      };

      await this.client.Profiles.createOrUpdateProfile(profileData);
      
      // Update external integration record
      await this.upsertExternalIntegration(member.id, {
        id: `email_${member.email}`, // Use email-based ID for now
        attributes: { email: member.email }
      });

    } catch (error) {
      console.error(`Error pushing member ${member.id} to Klaviyo:`, error);
      throw error;
    }
  }

  // Private helper methods
  private async findMemberByEmail(email: string): Promise<Member | null> {
    const stmt = this.db.db.prepare('SELECT * FROM members WHERE email = ?');
    const member = stmt.get(email) as Member | undefined;
    return member || null;
  }

  private async updateExistingMember(existingMember: Member, profile: KlaviyoProfile): Promise<Member> {
    const updateData: Partial<Member> = {};
    
    // Only update if Klaviyo has data and local data is missing or different
    if (profile.attributes.first_name && !existingMember.first_name) {
      updateData.first_name = profile.attributes.first_name;
    }
    if (profile.attributes.last_name && !existingMember.last_name) {
      updateData.last_name = profile.attributes.last_name;
    }

    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString();
      
      const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updateData);
      
      const stmt = this.db.db.prepare(`UPDATE members SET ${setClause} WHERE id = ?`);
      stmt.run(...values, existingMember.id);
    }

    // Return updated member
    const stmt = this.db.db.prepare('SELECT * FROM members WHERE id = ?');
    return stmt.get(existingMember.id) as Member;
  }

  private async createMemberFromProfile(profile: KlaviyoProfile): Promise<Member> {
    const memberData = {
      first_name: profile.attributes.first_name || 'Unknown',
      last_name: profile.attributes.last_name || 'User',
      email: profile.attributes.email,
      flags: 1, // Active by default
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

    const newMember = this.db.db.prepare('SELECT * FROM members WHERE id = ?').get(result.lastInsertRowid) as Member;
    return newMember;
  }

  private async upsertExternalIntegration(memberId: number, profile: KlaviyoProfile): Promise<void> {
    const stmt = this.db.db.prepare(`
      INSERT OR REPLACE INTO external_integrations 
      (member_id, system_name, external_id, external_data_json, last_synced_at, flags)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      memberId,
      'klaviyo',
      profile.id,
      JSON.stringify(profile),
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

  private extractCursor(nextUrl: string): string | undefined {
    const url = new URL(nextUrl);
    return url.searchParams.get('page[cursor]') || undefined;
  }
}