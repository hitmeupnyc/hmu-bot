import { BaseSyncService } from './BaseSyncService';
import { Member } from '../types';

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

export class KlaviyoSyncService extends BaseSyncService {
  private client: any;

  constructor() {
    super();
    if (!process.env.KLAVIYO_API_KEY) {
      console.warn('KLAVIYO_API_KEY not configured - Klaviyo sync will be disabled');
      // Stub client for when API key is not configured
      this.client = {
        Profiles: {
          getProfiles: () => Promise.resolve({ data: [], links: {} }),
          createOrUpdateProfile: () => Promise.resolve({})
        }
      };
    } else {
      // TODO: Fix Klaviyo API client initialization once library issue is resolved
      // This should be: this.client = new Klaviyo.ApiClient({ apiKey: process.env.KLAVIYO_API_KEY });
      this.client = {
        Profiles: {
          getProfiles: () => Promise.resolve({ data: [], links: {} }),
          createOrUpdateProfile: () => Promise.resolve({})
        }
      };
    }
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
      const updatedMember = await this.updateExistingMemberFromProfile(existingMember, profile);
      await this.upsertExternalIntegrationForProfile(updatedMember.id, profile);
      await this.updateSyncOperation(syncOperationId, 'success', 'Member updated', updatedMember.id);
      return updatedMember;
    } else {
      // Create new member
      const newMember = await this.createMemberFromProfile(profile);
      await this.upsertExternalIntegrationForProfile(newMember.id, profile);
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
      await this.upsertExternalIntegration(member.id, 'klaviyo', `email_${member.email}`, {
        id: `email_${member.email}`, // Use email-based ID for now
        attributes: { email: member.email }
      });

    } catch (error) {
      console.error(`Error pushing member ${member.id} to Klaviyo:`, error);
      throw error;
    }
  }

  // Private helper methods

  private async updateExistingMemberFromProfile(existingMember: Member, profile: KlaviyoProfile): Promise<Member> {
    const updates = {
      first_name: profile.attributes.first_name,
      last_name: profile.attributes.last_name
    };
    
    return await this.updateExistingMember(existingMember, updates);
  }

  private async createMemberFromProfile(profile: KlaviyoProfile): Promise<Member> {
    return await this.createBaseMember({
      first_name: profile.attributes.first_name || 'Unknown',
      last_name: profile.attributes.last_name || 'User',
      email: profile.attributes.email,
      flags: 1 // Active by default
    });
  }

  private async upsertExternalIntegrationForProfile(memberId: number, profile: KlaviyoProfile): Promise<void> {
    await this.upsertExternalIntegration(memberId, 'klaviyo', profile.id, profile, 1);
  }



  private extractCursor(nextUrl: string): string | undefined {
    const url = new URL(nextUrl);
    return url.searchParams.get('page[cursor]') || undefined;
  }
}