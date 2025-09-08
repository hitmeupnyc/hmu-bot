import { Effect } from 'effect'
import { useQuery, useMutation, useQueryClient, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query'
import { makeAuthenticatedClient, type ApiClient, type ClientConfig } from './client'

/**
 * React Query integration for Effect-based SDK.
 * 
 * This provides the best of both worlds:
 * - Full Effect type safety and composability
 * - React Query's caching, background updates, and UX patterns
 * - Seamless error handling that preserves HTTP status codes
 * 
 * Unlike axios-based approaches, this maintains end-to-end type safety
 * from API definition to React components.
 */

/**
 * Hook to create an authenticated Effect client for React components
 */
export const useEffectClient = (config: ClientConfig & { sessionToken?: string }) => {
  return makeAuthenticatedClient(config)
}

/**
 * Custom hook that runs an Effect and converts it to a React Query
 */
export const useEffectQuery = <T, E = unknown>(
  queryKey: unknown[],
  effectFn: (client: ApiClient) => Effect.Effect<T, E>,
  options?: Omit<UseQueryOptions<T, E>, 'queryKey' | 'queryFn'> & {
    client?: ReturnType<typeof makeAuthenticatedClient>
  }
) => {
  const defaultClient = useEffectClient({ 
    baseUrl: '/api',
    sessionToken: options?.client ? undefined : getSessionToken()
  })
  
  const client = options?.client || defaultClient

  return useQuery({
    queryKey,
    queryFn: () => 
      client.pipe(
        Effect.flatMap(effectFn),
        Effect.runPromise
      ),
    ...options
  })
}

/**
 * Custom hook for Effect-based mutations
 */
export const useEffectMutation = <T, E, V>(
  mutationFn: (client: ApiClient) => (variables: V) => Effect.Effect<T, E>,
  options?: Omit<UseMutationOptions<T, E, V>, 'mutationFn'> & {
    client?: ReturnType<typeof makeAuthenticatedClient>
  }
) => {
  const defaultClient = useEffectClient({ 
    baseUrl: '/api',
    sessionToken: getSessionToken()
  })
  
  const client = options?.client || defaultClient

  return useMutation({
    mutationFn: (variables: V) =>
      client.pipe(
        Effect.flatMap(mutationFn),
        Effect.flatMap(fn => fn(variables)),
        Effect.runPromise
      ),
    ...options
  })
}

/**
 * Pre-built hooks for common API operations using Effect client
 */

// Members hooks with Effect client
export const useEffectMembers = (params?: { page?: number; limit?: number; search?: string }) =>
  useEffectQuery(
    ['members', params],
    (client) => client.members['api.members.list']({ urlParams: params || {} })
  )

export const useEffectMember = (id: number, enabled = true) =>
  useEffectQuery(
    ['members', id],
    (client) => client.members['api.members.read']({ path: { id: id.toString() } }),
    { enabled: enabled && !!id }
  )

export const useCreateEffectMember = () => {
  const queryClient = useQueryClient()
  
  return useEffectMutation(
    (client) => (data: Parameters<ApiClient['members']['api.members.create']>[0]['payload']) =>
      client.members['api.members.create']({ payload: data }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['members'] })
      }
    }
  )
}

export const useUpdateEffectMember = () => {
  const queryClient = useQueryClient()
  
  return useEffectMutation(
    (client) => (params: { id: number; data: Parameters<ApiClient['members']['api.members.update']>[0]['payload'] }) =>
      client.members['api.members.update']({
        path: { id: params.id.toString() },
        payload: params.data
      }),
    {
      onSuccess: (_, { id }) => {
        queryClient.invalidateQueries({ queryKey: ['members'] })
        queryClient.invalidateQueries({ queryKey: ['members', id] })
      }
    }
  )
}

export const useDeleteEffectMember = () => {
  const queryClient = useQueryClient()
  
  return useEffectMutation(
    (client) => (id: number) =>
      client.members['api.members.delete']({ path: { id: id.toString() } }),
    {
      onSuccess: (_, id) => {
        queryClient.invalidateQueries({ queryKey: ['members'] })
        queryClient.removeQueries({ queryKey: ['members', id] })
      }
    }
  )
}

// Events hooks with Effect client
export const useEffectEvents = (params?: { page?: number; limit?: number; search?: string }) =>
  useEffectQuery(
    ['events', params],
    (client) => client.events['api.events.list']({ urlParams: params || {} })
  )

export const useEffectEvent = (id: number, enabled = true) =>
  useEffectQuery(
    ['events', id],
    (client) => client.events['api.events.read']({ path: { id: id.toString() } }),
    { enabled: enabled && !!id }
  )

export const useCreateEffectEvent = () => {
  const queryClient = useQueryClient()
  
  return useEffectMutation(
    (client) => (data: Parameters<ApiClient['events']['api.events.create']>[0]['payload']) =>
      client.events['api.events.create']({ payload: data }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['events'] })
      }
    }
  )
}

// Flags hooks with Effect client
export const useEffectFlags = () =>
  useEffectQuery(
    ['flags'],
    (client) => client.flags['api.flags.list']({})
  )

export const useEffectFlag = (id: string, enabled = true) =>
  useEffectQuery(
    ['flags', id],
    (client) => client.flags['api.flags.read']({ path: { id } }),
    { enabled: enabled && !!id }
  )

// Audit hooks with Effect client
export const useEffectAudit = (params?: { entityType?: string; entityId?: string; limit?: number }) =>
  useEffectQuery(
    ['audit', params],
    (client) => client.audit['api.audit.list']({ urlParams: params || {} })
  )

/**
 * Utility to get session token from browser storage
 * This properly integrates with the existing auth system
 */
function getSessionToken(): string | undefined {
  if (typeof window === 'undefined') return undefined
  
  // Try to get from cookie first (matches better-auth pattern)
  const cookies = document.cookie.split(';')
  const sessionCookie = cookies.find(cookie => 
    cookie.trim().startsWith('better-auth.session_token=')
  )
  
  if (sessionCookie) {
    return sessionCookie.split('=')[1]?.trim()
  }
  
  // Fallback to sessionStorage if needed
  return sessionStorage.getItem('session-token') || undefined
}

/**
 * Query key factories for consistent cache management with Effect client
 */
export const effectQueryKeys = {
  members: {
    all: ['members'] as const,
    lists: () => [...effectQueryKeys.members.all, 'list'] as const,
    list: (params: any) => [...effectQueryKeys.members.lists(), params] as const,
    details: () => [...effectQueryKeys.members.all, 'detail'] as const,
    detail: (id: number) => [...effectQueryKeys.members.details(), id] as const,
  },
  events: {
    all: ['events'] as const,
    lists: () => [...effectQueryKeys.events.all, 'list'] as const,
    list: (params: any) => [...effectQueryKeys.events.lists(), params] as const,
    details: () => [...effectQueryKeys.events.all, 'detail'] as const,
    detail: (id: number) => [...effectQueryKeys.events.details(), id] as const,
  },
  flags: {
    all: ['flags'] as const,
    lists: () => [...effectQueryKeys.flags.all, 'list'] as const,
    details: () => [...effectQueryKeys.flags.all, 'detail'] as const,
    detail: (id: string) => [...effectQueryKeys.flags.details(), id] as const,
  },
  audit: {
    all: ['audit'] as const,
    lists: () => [...effectQueryKeys.audit.all, 'list'] as const,
    list: (params: any) => [...effectQueryKeys.audit.lists(), params] as const,
  }
} as const