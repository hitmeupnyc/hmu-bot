import { Client, GatewayIntentBits, Guild, GuildMember, User, Role } from 'discord.js';
import { DatabaseService } from './DatabaseService';
import { Member, SyncOperation, ExternalIntegration } from '../types';
import crypto from 'crypto';

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

export class DiscordSyncService {
  private client: Client;
  private db: DatabaseService;
  private guildId: string;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
      ]
    });
    
    this.db = DatabaseService.getInstance();
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
    console.log(`Discord bot logged in as ${this.client.user?.tag}`);
  }

  /**
   * Setup Discord event listeners
   */
  private setupEventListeners(): void {
    this.client.on('ready', () => {
      console.log(`Discord bot ready! Logged in as ${this.client.user?.tag}`);
    });

    this.client.on('guildMemberAdd', async (member) => {
      await this.handleMemberJoin(member);
    });

    this.client.on('guildMemberRemove', async (member) => {
      await this.handleMemberLeave(member);
    });

    this.client.on('guildMemberUpdate', async (oldMember, newMember) => {
      await this.handleMemberUpdate(oldMember, newMember);
    });

    this.client.on('error', (error) => {
      console.error('Discord client error:', error);
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
    await this.upsertExternalIntegration(localMember.id, member);

    // Check roles for membership/professional affiliate status
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

    // Check for professional affiliate role changes
    for (const role of addedRoles.values()) {
      if (professionalRoleIds.includes(role.id)) {
        await this.updateMemberFlag(localMember.id, 2, true); // Set professional affiliate
      }
    }

    for (const role of removedRoles.values()) {
      if (professionalRoleIds.includes(role.id)) {
        await this.updateMemberFlag(localMember.id, 2, false); // Unset professional affiliate
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
    const stmt = this.db.db.prepare(`
      SELECT m.* FROM members m
      JOIN external_integrations ei ON m.id = ei.member_id
      WHERE ei.system_name = 'discord' AND ei.external_id = ? AND ei.flags & 1 = 1
    `);
    const member = stmt.get(discordId) as Member | undefined;
    return member || null;
  }

  private async createMemberFromDiscordUser(member: GuildMember): Promise<Member> {
    // Since Discord doesn't provide email by default, we create a placeholder
    const memberData = {
      first_name: member.user.globalName || member.user.username || 'Discord',
      last_name: 'User',
      email: `discord_${member.user.id}@placeholder.local`, // Placeholder email
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

    return this.db.db.prepare('SELECT * FROM members WHERE id = ?').get(result.lastInsertRowid) as Member;
  }

  private async updateMemberStatusFromRoles(memberId: number, member: GuildMember): Promise<void> {
    const professionalRoleIds = process.env.DISCORD_PROFESSIONAL_ROLE_IDS?.split(',') || [];
    
    // Check if member has any professional roles
    const hasProfessionalRole = member.roles.cache.some(role => 
      professionalRoleIds.includes(role.id)
    );

    if (hasProfessionalRole) {
      await this.updateMemberFlag(memberId, 2, true); // Set professional affiliate
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

  private async upsertExternalIntegration(memberId: number, member: GuildMember): Promise<void> {
    const stmt = this.db.db.prepare(`
      INSERT OR REPLACE INTO external_integrations 
      (member_id, system_name, external_id, external_data_json, last_synced_at, flags)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      memberId,
      'discord',
      member.user.id,
      JSON.stringify({
        user: member.user,
        nickname: member.nickname,
        roles: member.roles.cache.map(role => ({ id: role.id, name: role.name })),
        joined_at: member.joinedAt?.toISOString()
      }),
      new Date().toISOString(),
      1 // Active
    );
  }

  private async deactivateExternalIntegration(memberId: number, systemName: string): Promise<void> {
    const stmt = this.db.db.prepare(`
      UPDATE external_integrations 
      SET flags = flags & ~1, last_synced_at = ?
      WHERE member_id = ? AND system_name = ?
    `);

    stmt.run(new Date().toISOString(), memberId, systemName);
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