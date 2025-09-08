import { HttpApiClient, HttpClient, HttpClientRequest } from '@effect/platform'
import { Effect } from 'effect'
import { Api } from '~/api'

export interface ClientConfig {
  baseUrl: string
  sessionId?: string
  headers?: Record<string, string>
}

/**
 * Creates a properly typed Effect-based client from the HttpApi definition.
 * This is the primary SDK interface that preserves all Effect benefits.
 * 
 * Unlike the flawed Promise-wrapping approach, this:
 * - Maintains full type safety through Effect inference
 * - Preserves authentication context 
 * - Allows composition with other Effects
 * - Provides lazy evaluation and fiber-based concurrency
 */
export const makeClient = (config: ClientConfig) =>
  HttpApiClient.make(Api, {
    baseUrl: config.baseUrl,
    transformClient: (client) =>
      client.pipe(
        HttpClient.filterStatusOk,
        HttpClient.mapRequest((req) => {
          let updatedReq = req

          // Forward session ID for audit logging (matching frontend pattern)
          if (config.sessionId) {
            updatedReq = HttpClientRequest.setHeader(
              updatedReq,
              'x-session-id',
              config.sessionId
            )
          }

          // Add any additional headers
          if (config.headers) {
            for (const [key, value] of Object.entries(config.headers)) {
              updatedReq = HttpClientRequest.setHeader(updatedReq, key, value)
            }
          }

          return updatedReq
        })
      )
  })

/**
 * Type-safe client interface derived from the API
 */
export type ApiClient = Effect.Effect.Success<ReturnType<typeof makeClient>>

/**
 * Helper to create a client with authentication headers from browser context.
 * This properly forwards cookie authentication that the existing frontend relies on.
 */
export const makeAuthenticatedClient = (config: ClientConfig & { 
  sessionToken?: string 
}) =>
  makeClient({
    ...config,
    headers: {
      ...config.headers,
      ...(config.sessionToken && {
        'Cookie': `better-auth.session_token=${config.sessionToken}`
      })
    }
  })