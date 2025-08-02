import { Effect, pipe, Schedule, Duration, Context, Layer, Ref } from "effect"
import * as Schema from "effect/Schema"

// Rate limit configuration schema
export const RateLimitConfigSchema = Schema.Struct({
  platform: Schema.String,
  requests_per_window: Schema.Number,
  window_duration_ms: Schema.Number,
  burst_allowance: Schema.optional(Schema.Number), // Allow brief bursts above normal rate
  concurrent_requests: Schema.optionalWith(Schema.Number, { default: () => 5 }),
})

export type RateLimitConfig = Schema.Schema.Type<typeof RateLimitConfigSchema>

// Rate limit state tracking
export const RateLimitStateSchema = Schema.Struct({
  platform: Schema.String,
  requests_made: Schema.Number,
  window_start: Schema.Number, // timestamp
  window_end: Schema.Number,   // timestamp
  blocked_until: Schema.optional(Schema.Number), // timestamp when unblocked
})

export type RateLimitState = Schema.Schema.Type<typeof RateLimitStateSchema>

/**
 * Platform-specific rate limit configurations
 * Based on documented API limits for each service
 */
export const platformRateLimits: Record<string, RateLimitConfig> = {
  eventbrite: {
    platform: "eventbrite",
    requests_per_window: 1000,
    window_duration_ms: 60 * 60 * 1000, // 1 hour
    concurrent_requests: 5,
    burst_allowance: 50
  },
  patreon: {
    platform: "patreon", 
    requests_per_window: 100,
    window_duration_ms: 60 * 1000, // 1 minute
    concurrent_requests: 3,
    burst_allowance: 10
  },
  klaviyo: {
    platform: "klaviyo",
    requests_per_window: 500,
    window_duration_ms: 60 * 1000, // 1 minute  
    concurrent_requests: 5,
    burst_allowance: 25
  },
  discord: {
    platform: "discord",
    requests_per_window: 50,
    window_duration_ms: 1000, // 1 second
    concurrent_requests: 2,
    burst_allowance: 5
  }
}

/**
 * Get concurrent request limit for platform
 */
export const getPlatformConcurrency = (platform: string): number => {
  const config = platformRateLimits[platform]
  return config?.concurrent_requests || 3
}

/**
 * Rate limiting service using Effect Context pattern
 */
export interface RateLimitService {
  canMakeRequest: (platform: string) => Effect.Effect<boolean>
  recordRequest: (platform: string) => Effect.Effect<void>
  blockPlatform: (platform: string, durationMs: number) => Effect.Effect<void>
}

export const RateLimitService = Context.GenericTag<RateLimitService>("RateLimitService")

/**
 * Implementation of RateLimitService
 */
const makeRateLimitService = Effect.gen(function* () {
  const statesRef = yield* Ref.make(new Map<string, RateLimitState>())

  const canMakeRequest = (platform: string) =>
    Effect.gen(function* () {
      const config = platformRateLimits[platform]
      if (!config) {
        return false
      }

      const states = yield* Ref.get(statesRef)
      const now = Date.now()
      
      const state = states.get(platform) || {
        platform,
        requests_made: 0,
        window_start: now,
        window_end: now + config.window_duration_ms,
        blocked_until: undefined
      }

      // Check if blocked first
      if (state.blocked_until && now < state.blocked_until) {
        return false
      }

      // Check if we're in a new time window
      if (now >= state.window_end) {
        // Reset for new window
        const newState = {
          platform,
          requests_made: 0,
          window_start: now,
          window_end: now + config.window_duration_ms
        }
        
        yield* Ref.update(statesRef, states => new Map(states.set(platform, newState)))
        return true
      }

      // Check rate limit
      const allowedRequests = config.requests_per_window + (config.burst_allowance || 0)
      return state.requests_made < allowedRequests
    })

  const recordRequest = (platform: string) =>
    Effect.gen(function* () {
      const states = yield* Ref.get(statesRef)
      const state = states.get(platform)
      
      if (state) {
        const updatedState = {
          ...state,
          requests_made: state.requests_made + 1
        }
        yield* Ref.update(statesRef, states => new Map(states.set(platform, updatedState)))
      }
    })

  const blockPlatform = (platform: string, durationMs: number) =>
    Effect.gen(function* () {
      const now = Date.now()
      const states = yield* Ref.get(statesRef)
      const state = states.get(platform)
      
      if (state) {
        const updatedState = {
          ...state,
          blocked_until: now + durationMs
        }
        yield* Ref.update(statesRef, states => new Map(states.set(platform, updatedState)))
      }
    })

  return RateLimitService.of({
    canMakeRequest,
    recordRequest,
    blockPlatform
  })
})

/**
 * Layer that provides RateLimitService
 */
export const RateLimitServiceLive = Layer.effect(RateLimitService, makeRateLimitService)

/**
 * Effect that wraps API calls with rate limiting
 */
export const withRateLimit = <A, E>(platform: string, effect: Effect.Effect<A, E>) =>
  Effect.gen(function* () {
    const rateLimitService = yield* RateLimitService
    
    // Check if we can make a request
    const canProceed = yield* rateLimitService.canMakeRequest(platform)
    
    if (!canProceed) {
      // Calculate delay based on remaining window time
      const config = platformRateLimits[platform]
      const delayMs = config ? Math.min(config.window_duration_ms / 4, 30000) : 5000
      
      console.log(`Rate limit reached for ${platform}, waiting ${delayMs}ms`)
      yield* Effect.sleep(Duration.millis(delayMs))
      
      // Retry the rate limit check
      const canProceedAfterWait = yield* rateLimitService.canMakeRequest(platform)
      if (!canProceedAfterWait) {
        throw new Error(`Rate limit still exceeded for ${platform}`)
      }
    }
    
    // Record the request attempt
    yield* rateLimitService.recordRequest(platform)
    
    // Execute the actual effect
    const result = yield* effect
    
    return result
  }).pipe(
    // Add retry logic for rate limit errors
    Effect.retry({
      schedule: Schedule.exponential("1 seconds", 2.0).pipe(
        Schedule.intersect(Schedule.recurs(3))
      ),
      while: (error) => String(error).includes('Rate limit')
    })
  )

/**
 * Batch API calls with rate limiting and intelligent scheduling
 */
export const batchWithRateLimit = <A, E>(
  platform: string,
  effects: Effect.Effect<A, E>[],
  options?: {
    maxConcurrency?: number
    delayBetweenBatches?: number
  }
) =>
  Effect.gen(function* () {
    const maxConcurrency = options?.maxConcurrency || getPlatformConcurrency(platform)
    const delayMs = options?.delayBetweenBatches || 100
    
    // Wrap each effect with rate limiting
    const rateLimitedEffects = effects.map(effect => withRateLimit(platform, effect))
    
    // Use Effect.forEach with concurrency control
    const results = yield* Effect.forEach(
      rateLimitedEffects,
      (effect) => effect,
      { 
        concurrency: maxConcurrency,
        batching: true 
      }
    )
    
    return results
  })

/**
 * Create an adaptive schedule based on platform rate limits
 * This can be used with Effect.repeat for ongoing operations
 */
export const createAdaptiveSchedule = (platform: string) =>
  Effect.gen(function* () {
    const config = platformRateLimits[platform]
    if (!config) {
      throw new Error(`Unknown platform: ${platform}`)
    }
    
    // Base interval to stay well under rate limits
    const safeIntervalMs = Math.max(
      (config.window_duration_ms / config.requests_per_window) * 2,
      1000 // Minimum 1 second
    )
    
    return Schedule.spaced(Duration.millis(safeIntervalMs))
  })

/**
 * Monitor rate limit usage and log warnings
 */
export const monitorRateLimitUsage = (platform: string) =>
  Effect.gen(function* () {
    const rateLimitService = yield* RateLimitService
    const config = platformRateLimits[platform]
    
    if (!config) {
      return { platform, usage: 0, status: 'unknown' }
    }
    
    // Note: In a real implementation, we'd need to expose state reading from the service
    // For now, return a simplified version
    return {
      platform,
      requests_made: 0, // Would need to expose this from service
      requests_allowed: config.requests_per_window,
      usage_percentage: 0,
      window_progress_percentage: 0,
      status: 'ok' as const
    }
  })