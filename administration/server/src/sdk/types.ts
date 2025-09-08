/**
 * Type exports for the SDK - only data types, not Effect internals.
 * 
 * Unlike the nemesis's approach, we don't hide Effect types completely.
 * Instead, we provide clean imports for both Effect and Promise users.
 */

// Re-export core data types from API schemas
export type {
  // Member types
  Member,
  CreateMemberSchema as CreateMember,
  UpdateMemberSchema as UpdateMember,
} from '~/api/members/schemas'

export type {
  // Event types  
  Event,
  CreateEventSchema as CreateEvent,
  UpdateEventSchema as UpdateEvent,
  EventFlagSchema as EventFlag,
  GrantEventFlagSchema as GrantEventFlag,
} from '~/api/events/schemas'

export type {
  // Flag types
  Flag,
  CreateFlagSchema as CreateFlag,
  UpdateFlagSchema as UpdateFlag,
} from '~/api/flags/schemas'

export type {
  // Audit types
  AuditEntry,
} from '~/api/audit/schemas'

export type {
  // Common query parameters
  ListQuerySchema as ListQuery,
} from '~/api/schemas'

// SDK-specific configuration types
export interface ClientConfig {
  baseUrl: string
  sessionId?: string
  headers?: Record<string, string>
}

export interface AuthenticatedClientConfig extends ClientConfig {
  sessionToken?: string
}

// Response wrapper types that match API structure
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Error types - preserve HTTP status codes from Effect errors
export interface ApiError {
  message: string
  status: number
  code: string
  details?: any
}

export interface ValidationError extends ApiError {
  status: 400
  code: 'VALIDATION_ERROR'
  details: Record<string, string[]>
}

export interface NotFoundError extends ApiError {
  status: 404
  code: 'NOT_FOUND'
  resource: string
  id: string
}

export interface UnauthorizedError extends ApiError {
  status: 401
  code: 'UNAUTHORIZED'
  reason: 'missing_session' | 'invalid_session' | 'expired_session' | 'auth_service_error'
}