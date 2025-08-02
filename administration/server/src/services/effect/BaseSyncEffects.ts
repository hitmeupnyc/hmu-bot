import { Effect, pipe } from "effect"
import * as Schema from "effect/Schema"
import crypto from "crypto"
import { DatabaseService } from "./context/DatabaseService"
import { 
  SyncOperationSchema, 
  CreateSyncOperationSchema, 
  MemberDataSchema, 
  ExternalIntegrationSchema,
  HMACVerificationSchema,
  type SyncOperation,
  type CreateSyncOperation,
  type MemberData,
  type ExternalIntegration,
  type HMACVerification
} from "./schemas/SyncSchemas"
import { 
  SyncOperationError, 
  ExternalIntegrationError, 
  HMACVerificationError,
  MemberNotFoundError,
  DuplicateEmailError,
  InvalidEmailError
} from "./errors/SyncErrors"
import { DatabaseError } from "./errors/DatabaseErrors"
import type { Member } from "../../types"

/**
 * Create a new sync operation record
 */
export const createSyncOperation = (data: CreateSyncOperation) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService
    const validatedData = yield* Schema.decodeUnknown(CreateSyncOperationSchema)(data)
    
    const result = yield* db.query(async (db) =>
      db.insertInto('sync_operations')
        .values({
          platform: validatedData.platform,
          operation_type: validatedData.operation_type,
          external_id: validatedData.external_id,
          member_id: validatedData.member_id || null,
          status: validatedData.status,
          payload_json: validatedData.payload_json,
          error_message: validatedData.error_message || null,
          created_at: new Date().toISOString()
        })
        .returning('id')
        .executeTakeFirstOrThrow()
    )

    const syncOp = yield* db.query(async (db) =>
      db.selectFrom('sync_operations')
        .selectAll()
        .where('id', '=', result.id)
        .executeTakeFirstOrThrow()
    )
    
    return yield* Schema.decodeUnknown(SyncOperationSchema)(syncOp)
  }).pipe(
    Effect.mapError((error) => 
      error._tag === "ParseError" 
        ? new SyncOperationError({ 
            message: `Validation error: ${error.message}`, 
            platform: data.platform, 
            operation: data.operation_type 
          })
        : error
    )
  )

/**
 * Update an existing sync operation
 */
export const updateSyncOperation = (id: number, status: string, message?: string, memberId?: number) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService
    
    yield* db.query(async (db) =>
      db.updateTable('sync_operations')
        .set({
          status,
          error_message: message || null,
          member_id: memberId || null,
          processed_at: new Date().toISOString()
        })
        .where('id', '=', id)
        .execute()
    )
  })

/**
 * Find member by email
 */
export const findMemberByEmail = (email: string) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService
    
    const member = yield* db.query(async (db) =>
      db.selectFrom('members')
        .selectAll()
        .where('email', '=', email)
        .executeTakeFirst()
    )
    
    return member as Member | null
  })

/**
 * Update member flags using bitwise operations
 */
export const updateMemberFlag = (memberId: number, flag: number, value: boolean) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService
    
    const result = yield* db.query(async (db) =>
      db.selectFrom('members')
        .select('flags')
        .where('id', '=', memberId)
        .executeTakeFirst()
    )
    
    if (!result) {
      return yield* new MemberNotFoundError({ 
        identifier: memberId.toString(), 
        identifierType: "id" 
      })
    }
    
    let newFlags = result.flags
    
    if (value) {
      newFlags |= flag // Set flag
    } else {
      newFlags &= ~flag // Unset flag
    }

    yield* db.query(async (db) =>
      db.updateTable('members')
        .set({
          flags: newFlags,
          updated_at: new Date().toISOString()
        })
        .where('id', '=', memberId)
        .execute()
    )
  })

/**
 * Update existing member with new data (only if local data is missing)
 */
export const updateExistingMember = (existingMember: Member, updates: Partial<Member>) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService
    const updateData: Record<string, any> = {}

    // Only update if external source has data and local data is missing or empty
    if (updates.first_name && !existingMember.first_name) {
      updateData.first_name = updates.first_name
    }
    if (updates.last_name && !existingMember.last_name) {
      updateData.last_name = updates.last_name
    }

    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString()

      yield* db.query(async (db) =>
        db.updateTable('members')
          .set(updateData)
          .where('id', '=', existingMember.id)
          .execute()
      )
    }

    const updatedMember = yield* db.query(async (db) =>
      db.selectFrom('members')
        .selectAll()
        .where('id', '=', existingMember.id)
        .executeTakeFirstOrThrow()
    )
    
    return updatedMember as Member
  })

/**
 * Create or update external integration record
 */
export const upsertExternalIntegration = (
  memberId: number, 
  systemName: string, 
  externalId: string, 
  externalData: any,
  flags: number = 1
) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService
    const integrationData: ExternalIntegration = {
      member_id: memberId,
      system_name: systemName,
      external_id: externalId,
      external_data_json: JSON.stringify(externalData),
      flags,
      last_synced_at: new Date().toISOString()
    }
    
    const validatedData = yield* Schema.decodeUnknown(ExternalIntegrationSchema)(integrationData)
    
    yield* db.query(async (db) =>
      db.insertInto('external_integrations')
        .values({
          member_id: validatedData.member_id,
          system_name: validatedData.system_name,
          external_id: validatedData.external_id,
          external_data_json: validatedData.external_data_json,
          last_synced_at: validatedData.last_synced_at,
          flags: validatedData.flags
        })
        .onConflict((oc) =>
          oc.columns(['member_id', 'system_name']).doUpdateSet({
            external_id: validatedData.external_id,
            external_data_json: validatedData.external_data_json,
            last_synced_at: validatedData.last_synced_at,
            flags: validatedData.flags
          })
        )
        .execute()
    )
  }).pipe(
    Effect.mapError((error) => 
      error._tag === "ParseError" 
        ? new ExternalIntegrationError({ 
            message: `Validation error: ${error.message}`, 
            systemName, 
            externalId 
          })
        : error
    )
  )

/**
 * Deactivate external integration (set flags to inactive)
 */
export const deactivateExternalIntegration = (memberId: number, systemName: string) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService
    
    yield* db.query(async (db) =>
      db.updateTable('external_integrations')
        .set(eb => ({
          flags: eb('flags', '&', ~1), // Clear active flag
          last_synced_at: new Date().toISOString()
        }))
        .where('member_id', '=', memberId)
        .where('system_name', '=', systemName)
        .execute()
    )
  })

/**
 * Find member by external integration
 */
export const findMemberByExternalId = (systemName: string, externalId: string) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService
    
    const member = yield* db.query(async (db) =>
      db.selectFrom('members as m')
        .innerJoin('external_integrations as ei', 'm.id', 'ei.member_id')
        .selectAll('m')
        .where('ei.system_name', '=', systemName)
        .where('ei.external_id', '=', externalId)
        .where(eb => eb('ei.flags', '&', 1), '=', 1)
        .executeTakeFirst()
    )
    
    return member as Member | null
  })

/**
 * HMAC signature verification (common pattern for webhooks)
 */
export const verifyHMACSignature = (verification: HMACVerification) =>
  Effect.gen(function* () {
    const validated = yield* Schema.decodeUnknown(HMACVerificationSchema)(verification)
    
    if (!validated.secret) {
      return yield* new HMACVerificationError({ 
        message: "Secret is required for HMAC verification",
        algorithm: validated.algorithm
      })
    }

    const expectedSignature = yield* Effect.try({
      try: () => crypto
        .createHmac(validated.algorithm, validated.secret)
        .update(validated.payload)
        .digest('hex'),
      catch: (error) => new HMACVerificationError({ 
        message: `Failed to generate HMAC: ${String(error)}`,
        algorithm: validated.algorithm
      })
    })

    // Handle different signature formats
    const cleanSignature = validated.signature.replace(/^(sha256=|sha1=)/, '')
    
    const isValid = yield* Effect.try({
      try: () => crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(cleanSignature)
      ),
      catch: (error) => new HMACVerificationError({ 
        message: `Signature comparison failed: ${String(error)}`,
        algorithm: validated.algorithm
      })
    })

    return isValid
  }).pipe(
    Effect.mapError((error) => 
      error._tag === "ParseError" 
        ? new HMACVerificationError({ 
            message: `Validation error: ${error.message}`,
            algorithm: verification.algorithm
          })
        : error
    )
  )

/**
 * MD5 signature verification (for Patreon)
 */
export const verifyMD5Signature = (payload: string, signature: string, secret: string) =>
  Effect.gen(function* () {
    if (!secret) {
      return yield* new HMACVerificationError({ 
        message: "Secret is required for MD5 verification",
        algorithm: "md5"
      })
    }

    const expectedSignature = yield* Effect.try({
      try: () => crypto
        .createHmac('md5', secret)
        .update(payload)
        .digest('hex'),
      catch: (error) => new HMACVerificationError({ 
        message: `Failed to generate MD5 HMAC: ${String(error)}`,
        algorithm: "md5"
      })
    })

    return signature === expectedSignature
  })

/**
 * Create a new member with default values
 */
export const createBaseMember = (memberData: MemberData) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService
    const validatedData = yield* Schema.decodeUnknown(MemberDataSchema)(memberData)
    
    // Check if email already exists
    const existingMember = yield* findMemberByEmail(validatedData.email)
    if (existingMember) {
      return yield* new DuplicateEmailError({ email: validatedData.email })
    }
    
    const result = yield* db.query(async (db) =>
      db.insertInto('members')
        .values({
          first_name: validatedData.first_name,
          last_name: validatedData.last_name,
          email: validatedData.email,
          flags: validatedData.flags,
          date_added: validatedData.date_added,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .returning('id')
        .executeTakeFirstOrThrow()
    )

    const newMember = yield* db.query(async (db) =>
      db.selectFrom('members')
        .selectAll()
        .where('id', '=', result.id)
        .executeTakeFirstOrThrow()
    )
    
    return newMember as Member
  }).pipe(
    Effect.mapError((error) => 
      error._tag === "ParseError" 
        ? new InvalidEmailError({ email: memberData.email })
        : error
    )
  )

/**
 * Validate email format
 */
export const isValidEmail = (email: string) =>
  Effect.gen(function* () {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  })

/**
 * Generate a placeholder email when external service doesn't provide one
 */
export const generatePlaceholderEmail = (systemName: string, externalId: string) =>
  Effect.succeed(`${systemName}_${externalId}@placeholder.local`)

/**
 * Abstract bulk sync pipeline that can be composed with specific implementations
 */
export const createSyncPipeline = <T>(config: {
  platform: string
  fetchData: Effect.Effect<T[], any>
  processItem: (item: T) => Effect.Effect<void, any>
  concurrency?: number
}) =>
  Effect.gen(function* () {
    const items = yield* config.fetchData
    
    const results = yield* Effect.forEach(
      items,
      config.processItem,
      { 
        concurrency: config.concurrency || 10,
        batching: true 
      }
    )
    
    return { 
      synced: results.length, 
      errors: 0 // In a real implementation, you'd track errors
    }
  }).pipe(
    Effect.catchAll((error) => 
      Effect.succeed({ synced: 0, errors: 1 })
    )
  )