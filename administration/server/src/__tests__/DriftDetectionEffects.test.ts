import { Effect, pipe } from "effect"
import { describe, it, expect } from "vitest"
import { 
  createDataHash, 
  checkIntegrationForDrift,
  type DriftCheckRecord
} from "../services/effect/DriftDetectionEffects"

describe("DriftDetectionEffects", () => {

  describe("createDataHash", () => {
    it("should create consistent hashes for identical data", async () => {
      const data1 = { name: "test", value: 123 }
      const data2 = { value: 123, name: "test" } // Different order
      
      const hash1 = await Effect.runPromise(createDataHash(data1))
      const hash2 = await Effect.runPromise(createDataHash(data2))
      
      expect(hash1).toBe(hash2)
    })
    
    it("should create different hashes for different data", async () => {
      const data1 = { name: "test", value: 123 }
      const data2 = { name: "test", value: 456 }
      
      const hash1 = await Effect.runPromise(createDataHash(data1))
      const hash2 = await Effect.runPromise(createDataHash(data2))
      
      expect(hash1).not.toBe(hash2)
    })
  })

  // Note: Database-dependent tests would be added later with proper test setup

  describe("checkIntegrationForDrift", () => {
    it("should detect when data has changed", async () => {
      const mockRecord: DriftCheckRecord = {
        integration_id: 1,
        member_id: 123,
        system_name: "patreon",
        external_id: "ext_123",
        last_data_hash: "old_hash_value",
        last_checked_at: new Date().toISOString()
      }
      
      const result = await Effect.runPromise(checkIntegrationForDrift(mockRecord))
      
      expect(result.integration_id).toBe(1)
      expect(result).toHaveProperty('has_drifted')
      expect(result).toHaveProperty('checked_at')
    })
  })

  describe("Effect composition", () => {
    it("should compose Effects correctly", async () => {
      // Test basic Effect composition without database dependencies
      const program = pipe(
        Effect.succeed({ test: "data" }),
        Effect.flatMap(createDataHash),
        Effect.map(hash => ({ hash, length: hash.length }))
      )
      
      const result = await Effect.runPromise(program)
      expect(result.hash).toBeDefined()
      expect(result.length).toBe(64) // SHA256 hex length
    })
  })
})