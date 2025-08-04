import { Effect, pipe, Schedule } from "effect"
import * as Schema from "effect/Schema"
import crypto from "crypto"
import { DatabaseService } from "./context/DatabaseService"
import { DatabaseError } from "./errors/DatabaseErrors"

// Schema for drift detection record
export const DriftCheckRecordSchema = Schema.Struct({
  integration_id: Schema.Number,
  member_id: Schema.Number,
  system_name: Schema.String,
  external_id: Schema.String,
  last_data_hash: Schema.String,
  last_checked_at: Schema.String,
  current_data_hash: Schema.optional(Schema.String),
})

export type DriftCheckRecord = Schema.Schema.Type<typeof DriftCheckRecordSchema>

// Schema for drift detection result
export const DriftDetectionResultSchema = Schema.Struct({
  integration_id: Schema.Number,
  has_drifted: Schema.Boolean,
  old_hash: Schema.String,
  new_hash: Schema.optional(Schema.String),
  checked_at: Schema.String,
})

export type DriftDetectionResult = Schema.Schema.Type<typeof DriftDetectionResultSchema>

/**
 * Simple data hash function for drift detection
 * Takes external data JSON and creates a consistent hash
 */
export const createDataHash = (data: any) =>
  Effect.try({
    try: () => {
      const normalizedData = JSON.stringify(data, Object.keys(data).sort())
      return crypto.createHash('sha256').update(normalizedData).digest('hex')
    },
    catch: (error) => new DatabaseError({ 
      message: `Failed to hash data: ${String(error)}`,
      operation: "hash_creation"
    })
  })

/**
 * Get a sample of external integrations for drift checking
 * This is the "spot check" sampling strategy
 */
export const sampleIntegrationsForDriftCheck = (systemName?: string, sampleSize: number = 10) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService
    
    const query = db.query(async (db) => {
      let baseQuery = db
        .selectFrom('external_integrations')
        .select([
          'id as integration_id',
          'member_id',
          'system_name', 
          'external_id',
          'external_data_json',
          'last_synced_at'
        ])
        .where('flags', '&', 1) // Only active integrations
        .orderBy('last_synced_at', 'asc') // Oldest first for spot checking
        
      if (systemName) {
        baseQuery = baseQuery.where('system_name', '=', systemName)
      }
      
      return baseQuery.limit(sampleSize).execute()
    })
    
    const integrations = yield* query
    
    // Convert to drift check records with current hashes
    const records = yield* Effect.forEach(
      integrations,
      (integration) => Effect.gen(function* () {
        const hash = yield* createDataHash(JSON.parse(integration.external_data_json || '{}'))
        
        return {
          integration_id: integration.integration_id,
          member_id: integration.member_id,
          system_name: integration.system_name,
          external_id: integration.external_id,
          last_data_hash: hash,
          last_checked_at: integration.last_synced_at || new Date().toISOString(),
        } as DriftCheckRecord
      }),
      { concurrency: 5 }
    )
    
    return records
  })

/**
 * Mock function to simulate fetching fresh data from external API
 * In real implementation, this would call the actual platform APIs
 */
export const fetchFreshExternalData = (systemName: string, externalId: string) =>
  Effect.gen(function* () {
    // This is where you'd make actual API calls to external systems
    // For now, simulate with a small delay and mock data
    yield* Effect.sleep("100 millis")
    
    // Mock response - in reality this would be platform-specific API calls
    const mockData = {
      id: externalId,
      system: systemName,
      fetchedAt: new Date().toISOString(),
      // Add some randomness to simulate potential changes
      mockChangeIndicator: Math.random() > 0.8 ? 'changed' : 'unchanged'
    }
    
    return mockData
  })

/**
 * Check a single integration for drift
 */
export const checkIntegrationForDrift = (record: DriftCheckRecord) =>
  Effect.gen(function* () {
    // Fetch fresh data from external system
    const freshData = yield* fetchFreshExternalData(record.system_name, record.external_id)
    
    // Create hash of fresh data
    const newHash = yield* createDataHash(freshData)
    
    // Compare hashes
    const hasDrifted = newHash !== record.last_data_hash
    
    const result: DriftDetectionResult = {
      integration_id: record.integration_id,
      has_drifted: hasDrifted,
      old_hash: record.last_data_hash,
      new_hash: hasDrifted ? newHash : undefined,
      checked_at: new Date().toISOString()
    }
    
    return yield* Schema.decodeUnknown(DriftDetectionResultSchema)(result)
  })

/**
 * Batch drift detection for multiple integrations
 */
export const batchDriftDetection = (records: DriftCheckRecord[], concurrency: number = 3) =>
  Effect.gen(function* () {
    const results = yield* Effect.forEach(
      records,
      checkIntegrationForDrift,
      { 
        concurrency,
        batching: true 
      }
    )
    
    const driftedRecords = results.filter(r => r.has_drifted)
    
    return {
      total_checked: results.length,
      drifted_count: driftedRecords.length,
      drift_percentage: results.length > 0 ? (driftedRecords.length / results.length) * 100 : 0,
      drifted_integrations: driftedRecords
    }
  })

/**
 * Scheduled drift detection pipeline
 * This would be the core of the "spot check" system
 */
export const runScheduledDriftDetection = (
  systemName?: string, 
  sampleSize: number = 10,
  concurrency: number = 3
) =>
  Effect.gen(function* () {
    console.log(`Starting drift detection for ${systemName || 'all systems'}, sample size: ${sampleSize}`)
    
    // Sample integrations for checking
    const records = yield* sampleIntegrationsForDriftCheck(systemName, sampleSize)
    
    if (records.length === 0) {
      console.log('No integrations found for drift checking')
      return { total_checked: 0, drifted_count: 0, drift_percentage: 0, drifted_integrations: [] }
    }
    
    // Run batch drift detection
    const results = yield* batchDriftDetection(records, concurrency)
    
    console.log(`Drift detection complete: ${results.drifted_count}/${results.total_checked} records drifted (${results.drift_percentage.toFixed(1)}%)`)
    
    // If drift detected, this is where you'd queue sync operations
    if (results.drifted_count > 0) {
      console.log('Drift detected for integrations:', results.drifted_integrations.map(r => r.integration_id))
      // TODO: Queue sync operations for drifted records
    }
    
    return results
  })

/**
 * Create a scheduled drift check using Effect Schedule
 * This demonstrates the scheduling pattern for regular spot checks
 */
export const createDriftCheckSchedule = (intervalMinutes: number = 30) =>
  Schedule.spaced(`${intervalMinutes} minutes`)

/**
 * Run continuous drift monitoring
 * This would be started once and run indefinitely with the specified schedule
 */
export const startDriftMonitoring = (intervalMinutes: number = 30, sampleSize: number = 10) =>
  Effect.gen(function* () {
    const schedule = createDriftCheckSchedule(intervalMinutes)
    
    yield* Effect.repeat(
      runScheduledDriftDetection(undefined, sampleSize),
      schedule
    )
  })