import { Client, GatewayIntentBits, Guild, GuildMember, PartialGuildMember, User, Role } from 'discord.js';
import { BaseSyncService } from './BaseSyncService';
import { Member, SyncOperation, ExternalIntegration } from '../types';
import { logConnection, logSyncOperation, logWebhook } from '../utils/logger';

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  email?: string;
  verified?: boolean;
  avatar?: string;
  bot?: boolean;
  global_name?: string;
}

export interface DiscordGuildMember {
  user: DiscordUser;
  nick?: string;
  roles: string[];
  joined_at: string;
  premium_since?: string;
  deaf?: boolean;
  mute?: boolean;
  pending?: boolean;
  permissions?: string;
}

export interface DiscordWebhookPayload {
  guild_id: string;
  user_id: string;
  event_type: 'member_join' | 'member_leave' | 'member_update' | 'role_update';
  member?: DiscordGuildMember;
  old_member?: Partial<DiscordGuildMember>;
}

export class DiscordSyncService extends BaseSyncService {
  private client: Client;
  private guildId: string;

  constructor() {
    super();
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
      ]
    });
    
    this.guildId = process.env.DISCORD_GUILD_ID || '';
    
    this.setupEventListeners();
  }

  /**
   * Initialize Discord bot connection
   */
  async initialize(): Promise<void> {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
      throw new Error('Discord bot token not configured');
    }

    await this.client.login(token);
    logConnection.established('discord', { 
      botTag: this.client.user?.tag,
      guildId: this.guildId 
    });
  }

  /**
   * Setup Discord event listeners
   */
  private setupEventListeners(): void {
    this.client.on('ready', () => {
      logConnection.established('discord', { 
        botTag: this.client.user?.tag,
        guilds: this.client.guilds.cache.size
      });
    });

    this.client.on('guildMemberAdd', async (member) => {
      try {
        await this.handleMemberJoin(member);
      } catch (error) {
        logSyncOperation.failed('discord', 'member_join', error as Error, member.user.id);
      }
    });

    this.client.on('guildMemberRemove', async (member) => {
      if (member.partial) return; // Skip partial members
      try {
        await this.handleMemberLeave(member);
      } catch (error) {
        logSyncOperation.failed('discord', 'member_leave', error as Error, member.user.id);
      }
    });

    this.client.on('guildMemberUpdate', async (oldMember, newMember) => {
      if (oldMember.partial || newMember.partial) return; // Skip partial members
      try {
        await this.handleMemberUpdate(oldMember, newMember);
      } catch (error) {
        logSyncOperation.failed('discord', 'member_update', error as Error, newMember.user.id);
      }
    });

    this.client.on('disconnect', () => {
      logConnection.lost('discord', 'Client disconnected');
    });

    this.client.on('error', (error) => {
      logConnection.lost('discord', error.message);
    });
  }

  /**
   * Handle Discord member join event
   */
  async handleMemberJoin(member: GuildMember): Promise<void> {
    const syncOperation = await this.createSyncOperation({
      platform: 'discord',
      operation_type: 'webhook',
      external_id: member.user.id,
      status: 'pending',
      payload_json: JSON.stringify({
        event_type: 'member_join',
        user: member.user,
        member: {
          nick: member.nickname,
          roles: member.roles.cache.map(role => role.id),
          joined_at: member.joinedAt?.toISOString()
        }
      })
    });

    try {
      await this.syncDiscordMember(member, syncOperation.id);
    } catch (error) {
      await this.updateSyncOperation(
        syncOperation.id,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Handle Discord member leave event
   */
  async handleMemberLeave(member: GuildMember): Promise<void> {
    const syncOperation = await this.createSyncOperation({
      platform: 'discord',
      operation_type: 'webhook',
      external_id: member.user.id,
      status: 'pending',
      payload_json: JSON.stringify({
        event_type: 'member_leave',
        user: member.user
      })
    });

    try {
      // Find member in our database
      const localMember = await this.findMemberByDiscordId(member.user.id);
      if (localMember) {
        // Mark external integration as inactive
        await this.deactivateExternalIntegration(localMember.id, 'discord');
        await this.updateSyncOperation(syncOperation.id, 'success', 'Member left Discord', localMember.id);
      } else {
        await this.updateSyncOperation(syncOperation.id, 'success', 'Member not found in local database');
      }
    } catch (error) {
      await this.updateSyncOperation(
        syncOperation.id,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Handle Discord member update event (role changes, nickname changes, etc.)
   */
  async handleMemberUpdate(oldMember: GuildMember, newMember: GuildMember): Promise<void> {
    const syncOperation = await this.createSyncOperation({
      platform: 'discord',
      operation_type: 'webhook',
      external_id: newMember.user.id,
      status: 'pending',
      payload_json: JSON.stringify({
        event_type: 'member_update',
        old_member: {
          nick: oldMember.nickname,
          roles: oldMember.roles.cache.map(role => role.id)
        },
        new_member: {
          nick: newMember.nickname,
          roles: newMember.roles.cache.map(role => role.id)
        }
      })
    });

    try {
      // Check for role changes that might affect membership status
      const oldRoles = oldMember.roles.cache;
      const newRoles = newMember.roles.cache;
      
      const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
      const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));

      if (addedRoles.size > 0 || removedRoles.size > 0) {
        await this.handleRoleChanges(newMember, addedRoles, removedRoles);
      }

      await this.updateSyncOperation(syncOperation.id, 'success', 'Member updated');
    } catch (error) {
      await this.updateSyncOperation(
        syncOperation.id,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Sync a Discord member to our database
   */
  async syncDiscordMember(member: GuildMember, syncOperationId: number): Promise<Member | null> {
    // Check if we can find this member by Discord ID in external integrations
    let localMember = await this.findMemberByDiscordId(member.user.id);
    
    if (!localMember) {
      // If no direct Discord link, try to find by email if we have OAuth data
      // For now, we'll create a placeholder member
      localMember = await this.createMemberFromDiscordUser(member);
    }

    // Update external integration
    await this.upsertExternalIntegrationForMember(localMember.id, member);

    // Check roles for membership status (placeholder logic)
    await this.updateMemberStatusFromRoles(localMember.id, member);

    await this.updateSyncOperation(syncOperationId, 'success', 'Discord member synced', localMember.id);
    return localMember;
  }

  /**
   * Handle role changes for a member
   */
  async handleRoleChanges(member: GuildMember, addedRoles: any, removedRoles: any): Promise<void> {
    const localMember = await this.findMemberByDiscordId(member.user.id);
    if (!localMember) return;

    // Define role mappings (these would be configurable)
    const professionalRoleIds = process.env.DISCORD_PROFESSIONAL_ROLE_IDS?.split(',') || [];
    const memberRoleIds = process.env.DISCORD_MEMBER_ROLE_IDS?.split(',') || [];

    // Check for special role changes (placeholder logic)
    const specialRoleIds = process.env.DISCORD_SPECIAL_ROLE_IDS?.split(',') || [];
    
    for (const role of addedRoles.values()) {
      if (specialRoleIds.includes(role.id)) {
        await this.updateMemberFlag(localMember.id, 2, true); // Set special status flag
        logSyncOperation.success('discord', 'role_added', localMember.id.toString(), localMember.id, {
          roleId: role.id,
          roleName: role.name
        });
      }
    }

    for (const role of removedRoles.values()) {
      if (specialRoleIds.includes(role.id)) {
        await this.updateMemberFlag(localMember.id, 2, false); // Unset special status flag
        logSyncOperation.success('discord', 'role_removed', localMember.id.toString(), localMember.id, {
          roleId: role.id,
          roleName: role.name
        });
      }
    }
  }

  /**
   * Bulk sync all Discord members
   */
  async bulkSync(): Promise<{ synced: number; errors: number }> {
    let synced = 0;
    let errors = 0;

    try {
      const guild = await this.client.guilds.fetch(this.guildId);
      const members = await guild.members.fetch();

      for (const [memberId, member] of members) {
        if (member.user.bot) continue; // Skip bots

        const syncOperation = await this.createSyncOperation({
          platform: 'discord',
          operation_type: 'bulk_sync',
          external_id: member.user.id,
          status: 'pending',
          payload_json: JSON.stringify({
            user: member.user,
            roles: member.roles.cache.map(role => role.id),
            joined_at: member.joinedAt?.toISOString()
          })
        });

        try {
          await this.syncDiscordMember(member, syncOperation.id);
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
      console.error('Discord bulk sync error:', error);
      throw error;
    }
  }

  /**
   * Add roles to a Discord member
   */
  async addRoleToMember(discordUserId: string, roleId: string): Promise<boolean> {
    try {
      const guild = await this.client.guilds.fetch(this.guildId);
      const member = await guild.members.fetch(discordUserId);
      const role = await guild.roles.fetch(roleId);

      if (role && member) {
        await member.roles.add(role);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error adding role ${roleId} to user ${discordUserId}:`, error);
      return false;
    }
  }

  /**
   * Remove roles from a Discord member
   */
  async removeRoleFromMember(discordUserId: string, roleId: string): Promise<boolean> {
    try {
      const guild = await this.client.guilds.fetch(this.guildId);
      const member = await guild.members.fetch(discordUserId);
      const role = await guild.roles.fetch(roleId);

      if (role && member) {
        await member.roles.remove(role);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error removing role ${roleId} from user ${discordUserId}:`, error);
      return false;
    }
  }

  /**
   * Send a direct message to a Discord user
   */
  async sendDirectMessage(discordUserId: string, message: string): Promise<boolean> {
    try {
      const user = await this.client.users.fetch(discordUserId);
      await user.send(message);
      return true;
    } catch (error) {
      console.error(`Error sending DM to user ${discordUserId}:`, error);
      return false;
    }
  }

  // Private helper methods
  private async findMemberByDiscordId(discordId: string): Promise<Member | null> {
    return await this.findMemberByExternalId('discord', discordId);
  }

  private async createMemberFromDiscordUser(member: GuildMember): Promise<Member> {
    // Since Discord doesn't provide email by default, we create a placeholder
    return await this.createBaseMember({
      first_name: member.user.globalName || member.user.username || 'Discord',
      last_name: 'User',
      email: this.generatePlaceholderEmail('discord', member.user.id),
      flags: 1 // Active by default
    });
  }

  private async updateMemberStatusFromRoles(memberId: number, member: GuildMember): Promise<void> {
    // Placeholder: Configure role mappings based on your club's needs
    const specialRoleIds = process.env.DISCORD_SPECIAL_ROLE_IDS?.split(',') || [];
    
    // Example: Check if member has any special roles that should update their status
    const hasSpecialRole = member.roles.cache.some(role => 
      specialRoleIds.includes(role.id)
    );

    if (hasSpecialRole) {
      // Placeholder: Update member flags based on your business logic
      // Example: Set flag bit 2 for special status
      await this.updateMemberFlag(memberId, 2, true);
      
      logSyncOperation.success('discord', 'status_update', member.user.id, memberId, {
        specialRole: true,
        roleCount: member.roles.cache.size
      });
    }
  }


  private async upsertExternalIntegrationForMember(memberId: number, member: GuildMember): Promise<void> {
    const externalData = {
      user: member.user,
      nickname: member.nickname,
      roles: member.roles.cache.map(role => ({ id: role.id, name: role.name })),
      joined_at: member.joinedAt?.toISOString()
    };

    await this.upsertExternalIntegration(memberId, 'discord', member.user.id, externalData, 1);
  }



}