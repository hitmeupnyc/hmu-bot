/**
 * Club Management SDK
 * 
 * Superior architecture that provides both Effect-first and Promise-based interfaces.
 * Unlike flawed Promise-wrapping approaches, this preserves type safety and enables
 * progressive adoption of Effect benefits.
 */

// Effect-first SDK (primary interface)
export { makeClient, makeAuthenticatedClient } from './client'
export type { ApiClient, ClientConfig } from './client'

// Promise adapter for gradual migration
export { 
  PromiseClient, 
  AuthenticatedPromiseClient,
  createPromiseClient,
  createAuthenticatedPromiseClient 
} from './promise'

// Type exports
export type * from './types'

// React Query integration
export * from './react-query'

// Re-export Effect utilities for advanced users
export { Effect, Runtime } from 'effect'