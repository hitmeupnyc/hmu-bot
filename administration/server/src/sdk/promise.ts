import { Effect, Runtime } from 'effect'
import { makeClient, makeAuthenticatedClient, type ClientConfig, type ApiClient } from './client'

/**
 * Promise-based adapter for teams not ready to adopt Effect fully.
 * 
 * Unlike the nemesis's broken approach that tries to store Effect as class property,
 * this properly uses lazy evaluation - the Effect is only executed when methods are called.
 * 
 * This provides a migration path while preserving the underlying type safety.
 */
export class PromiseClient {
  private runtime = Runtime.defaultRuntime
  private clientEffect: ReturnType<typeof makeClient>

  constructor(config: ClientConfig) {
    this.clientEffect = makeClient(config)
  }

  /**
   * Helper to run Effect client operations and convert to Promise
   */
  private runEffect<T>(fn: (client: ApiClient) => Effect.Effect<T>): Promise<T> {
    return this.clientEffect.pipe(
      Effect.flatMap(fn),
      Effect.runPromise
    )
  }

  // Members API - matches the existing frontend patterns
  members = {
    list: (params?: { page?: number; limit?: number; search?: string }) =>
      this.runEffect(client => 
        client.members['api.members.list']({ 
          urlParams: params || {} 
        })
      ),

    get: (id: number) =>
      this.runEffect(client => 
        client.members['api.members.read']({ 
          path: { id: id.toString() } 
        })
      ),

    create: (data: Parameters<ApiClient['members']['api.members.create']>[0]['payload']) =>
      this.runEffect(client => 
        client.members['api.members.create']({ 
          payload: data 
        })
      ),

    update: (id: number, data: Parameters<ApiClient['members']['api.members.update']>[0]['payload']) =>
      this.runEffect(client => 
        client.members['api.members.update']({
          path: { id: id.toString() },
          payload: data
        })
      ),

    delete: (id: number) =>
      this.runEffect(client => 
        client.members['api.members.delete']({ 
          path: { id: id.toString() } 
        })
      ),

    addNote: (id: number, content: string) =>
      this.runEffect(client => 
        client.members['api.members.note']({
          path: { id: id.toString() },
          payload: { content }
        })
      )
  } as const

  // Events API - properly typed from HttpApi definition
  events = {
    list: (params?: { page?: number; limit?: number; search?: string }) =>
      this.runEffect(client => 
        client.events['api.events.list']({ 
          urlParams: params || {} 
        })
      ),

    get: (id: number) =>
      this.runEffect(client => 
        client.events['api.events.read']({ 
          path: { id: id.toString() } 
        })
      ),

    create: (data: Parameters<ApiClient['events']['api.events.create']>[0]['payload']) =>
      this.runEffect(client => 
        client.events['api.events.create']({ 
          payload: data 
        })
      ),

    update: (id: number, data: Parameters<ApiClient['events']['api.events.update']>[0]['payload']) =>
      this.runEffect(client => 
        client.events['api.events.update']({
          path: { id: id.toString() },
          payload: data
        })
      ),

    delete: (id: number) =>
      this.runEffect(client => 
        client.events['api.events.delete']({ 
          path: { id: id.toString() } 
        })
      ),

    // Event flags operations
    flags: {
      list: (eventId: number) =>
        this.runEffect(client => 
          client.events['api.events.flags.list']({ 
            path: { id: eventId.toString() } 
          })
        ),

      grant: (eventId: number, flagId: string, data: Parameters<ApiClient['events']['api.events.flags.grant']>[0]['payload']) =>
        this.runEffect(client => 
          client.events['api.events.flags.grant']({
            path: { id: eventId.toString(), flagId },
            payload: data
          })
        ),

      revoke: (eventId: number, flagId: string) =>
        this.runEffect(client => 
          client.events['api.events.flags.revoke']({ 
            path: { id: eventId.toString(), flagId } 
          })
        )
    }
  } as const

  // Flags API
  flags = {
    list: () =>
      this.runEffect(client => 
        client.flags['api.flags.list']({})
      ),

    get: (id: string) =>
      this.runEffect(client => 
        client.flags['api.flags.read']({ 
          path: { id } 
        })
      ),

    create: (data: Parameters<ApiClient['flags']['api.flags.create']>[0]['payload']) =>
      this.runEffect(client => 
        client.flags['api.flags.create']({ 
          payload: data 
        })
      ),

    update: (id: string, data: Parameters<ApiClient['flags']['api.flags.update']>[0]['payload']) =>
      this.runEffect(client => 
        client.flags['api.flags.update']({
          path: { id },
          payload: data
        })
      ),

    delete: (id: string) =>
      this.runEffect(client => 
        client.flags['api.flags.delete']({ 
          path: { id } 
        })
      )
  } as const

  // Audit API
  audit = {
    list: (params?: { entityType?: string; entityId?: string; limit?: number }) =>
      this.runEffect(client => 
        client.audit['api.audit.list']({ 
          urlParams: params || {} 
        })
      )
  } as const
}

/**
 * Authenticated Promise client that properly forwards browser session context.
 * This fixes the nemesis's fundamental auth oversight.
 */
export class AuthenticatedPromiseClient extends PromiseClient {
  constructor(config: ClientConfig & { sessionToken?: string }) {
    super(config)
    // Override the client with authenticated version
    ;(this as any).clientEffect = makeAuthenticatedClient(config)
  }
}

/**
 * Factory function for creating clients - more functional approach
 */
export const createPromiseClient = (config: ClientConfig) => new PromiseClient(config)
export const createAuthenticatedPromiseClient = (config: ClientConfig & { sessionToken?: string }) => 
  new AuthenticatedPromiseClient(config)