import { Effect } from "effect"
import * as Schema from "effect/Schema"
import { 
  DiscordUserSchema,
  DiscordGuildMemberSchema,
  DiscordWebhookPayloadSchema,
  SyncResultSchema,
  type DiscordUser,
  type DiscordGuildMember,
  type DiscordWebhookPayload,
  type SyncResult
} from "./schemas/CommonSchemas"
import {
  createSyncOperation,
  updateSyncOperation,
  findMemberByEmail,
  findMemberByExternalId,
  createBaseMember,
  updateExistingMember,
  upsertExternalIntegration,
  updateMemberFlag,
  verifyHMACSignature
} from "./BaseSyncEffects"
import type { Member } from "../../types"

/**
 * Discord configuration
 */
const loadDiscordConfig = () =>
  Effect.gen(function* () {
    const token = process.env.DISCORD_BOT_TOKEN
    const guildId = process.env.DISCORD_GUILD_ID
    const webhookSecret = process.env.DISCORD_WEBHOOK_SECRET
    
    if (!token || !guildId) {
      return yield* Effect.fail(new Error("Discord configuration missing"))
    }
    
    return { token, guildId, webhookSecret }
  })

/**
 * Create member from Discord user data
 */
const createMemberFromDiscordUser = (discordUser: DiscordUser, guildMember?: DiscordGuildMember) =>
  Effect.gen(function* () {
    // Discord users may not have email, so generate placeholder
    const email = discordUser.email || `discord_${discordUser.id}@placeholder.local`
    
    // Determine display name preference
    const firstName = discordUser.global_name?.split(' ')[0] || 
                     guildMember?.nick || 
                     discordUser.username || 
                     'Discord'
    const lastName = discordUser.global_name?.split(' ').slice(1).join(' ') || 
                    'User'
    
    return yield* createBaseMember({
      first_name: firstName,
      last_name: lastName,
      email,
      flags: 1, // Active by default
      date_added: new Date().toISOString()
    })
  })

/**
 * Sync Discord guild member to local member database
 */
export const syncDiscordMember = (guildMember: DiscordGuildMember, syncOperationId: number) =>
  Effect.gen(function* () {
    const validatedMember = yield* Schema.decodeUnknown(DiscordGuildMemberSchema)(guildMember)
    
    // Look for existing member by Discord ID first
    let member = yield* findMemberByExternalId('discord', validatedMember.user.id)
    
    // If not found by Discord ID, try by email (if available)
    if (!member && validatedMember.user.email) {
      member = yield* findMemberByEmail(validatedMember.user.email)
    }
    
    if (member) {
      // Update existing member with latest Discord info
      const updates = {
        first_name: validatedMember.user.global_name?.split(' ')[0] || 
                   validatedMember.nick || 
                   validatedMember.user.username,
        last_name: validatedMember.user.global_name?.split(' ').slice(1).join(' ') || 'User'
      }
      member = yield* updateExistingMember(member, updates)
    } else {
      // Create new member
      member = yield* createMemberFromDiscordUser(validatedMember.user, validatedMember)
    }
    
    // Update Discord integration
    yield* upsertExternalIntegration(
      member.id, 
      'discord', 
      validatedMember.user.id, 
      {
        username: validatedMember.user.username,
        discriminator: validatedMember.user.discriminator,
        nick: validatedMember.nick,
        roles: validatedMember.roles,
        joined_at: validatedMember.joined_at,
        premium_since: validatedMember.premium_since
      }
    )
    
    // Update member flags based on roles or premium status
    if (validatedMember.premium_since) {
      yield* updateMemberFlag(member.id, 4, true) // Premium member flag
    }
    
    yield* updateSyncOperation(syncOperationId, 'success', 'Discord member synced', member.id)
    return member
  })

/**
 * Handle Discord webhook event
 */
export const handleDiscordWebhook = (payload: DiscordWebhookPayload, signature?: string) =>
  Effect.gen(function* () {
    const validatedPayload = yield* Schema.decodeUnknown(DiscordWebhookPayloadSchema)(payload)
    
    // Verify webhook signature if secret is configured
    if (signature) {
      const config = yield* loadDiscordConfig()
      if (config.webhookSecret) {
        yield* verifyHMACSignature({
          payload: JSON.stringify(payload),
          signature,
          secret: config.webhookSecret,
          algorithm: 'sha256'
        })
      }
    }
    
    const syncOperation = yield* createSyncOperation({
      platform: 'discord',
      operation_type: 'webhook',
      external_id: validatedPayload.user_id,
      status: 'pending',
      payload_json: JSON.stringify(validatedPayload)
    })
    
    const result = yield* Effect.gen(function* () {
      switch (validatedPayload.event_type) {
        case 'member_join':
        case 'member_update':
          if (validatedPayload.member) {
            return yield* syncDiscordMember(validatedPayload.member, syncOperation.id)
          }
          break
          
        case 'member_leave':
          // Deactivate member's Discord integration
          const member = yield* findMemberByExternalId('discord', validatedPayload.user_id)
          if (member) {
            yield* updateMemberFlag(member.id, 1, false) // Deactivate member
            yield* updateSyncOperation(syncOperation.id, 'success', 'Member left Discord')
          }
          break
          
        case 'role_update':
          // Handle role updates
          if (validatedPayload.member) {
            return yield* syncDiscordMember(validatedPayload.member, syncOperation.id)
          }
          break
      }
      
      return null
    }).pipe(
      Effect.catchAll((error) => 
        Effect.gen(function* () {
          yield* updateSyncOperation(
            syncOperation.id,
            'failed',
            error instanceof Error ? error.message : 'Unknown error'
          )
          return yield* Effect.fail(error)
        })
      )
    )
    
    return result
  })

/**
 * Bulk sync Discord guild members (mock implementation)
 */
export const bulkSyncDiscordMembers = (guildId: string) =>
  Effect.gen(function* () {
    const config = yield* loadDiscordConfig()
    
    // This would typically use the Discord.js client to fetch guild members
    // For now, we'll return a mock implementation
    const mockMembers: DiscordGuildMember[] = []
    
    let synced = 0
    let errors = 0
    
    const results = yield* Effect.forEach(
      mockMembers,
      (member) => Effect.gen(function* () {
        const syncOperation = yield* createSyncOperation({
          platform: 'discord',
          operation_type: 'bulk_sync',
          external_id: member.user.id,
          status: 'pending',
          payload_json: JSON.stringify(member)
        })
        
        return yield* Effect.match(syncDiscordMember(member, syncOperation.id), {
          onFailure: () => ({ success: false, userId: member.user.id }),
          onSuccess: () => ({ success: true, userId: member.user.id })
        })
      }),
      { concurrency: 10 }
    )
    
    synced = results.filter(r => r.success).length
    errors = results.filter(r => !r.success).length
    
    return yield* Schema.decodeUnknown(SyncResultSchema)({ synced, errors })
  })