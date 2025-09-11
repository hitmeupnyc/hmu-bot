/**
 * Type exports for the SDK - only data types, not Effect internals.
 *
 * Unlike the nemesis's approach, we don't hide Effect types completely.
 * Instead, we provide clean imports for both Effect and Promise users.
 */

// Re-export core data types from API schemas
export type {
  CreateMemberSchema as CreateMember,
  GrantFlagSchema as GrantFlag,
  // Member types
  MemberSchema,
  RevokeFlagSchema as RevokeFlag,
  UpdateMemberSchema as UpdateMember,
} from '~/api/members/schemas';

export type {
  CreateEventSchema as CreateEvent,
  // Event types
  EventSchema as Event,
  EventFlagSchema as EventFlag,
  GrantEventFlagSchema as GrantEventFlag,
  UpdateEventSchema as UpdateEvent,
} from '~/api/events/schemas';

export type {
  // Flag types
  FlagSchema as Flag,
} from '~/api/flags/schemas';

// Audit types - defined inline since no separate schemas file
export interface AuditEntry {
  id?: number;
  entity_type: string;
  entity_id?: number;
  action: string;
  user_session_id?: string;
  user_id?: string;
  user_email?: string;
  user_ip?: string;
  old_values_json?: string;
  old_values?: any;
  new_values_json?: string;
  new_values?: any;
  metadata_json?: string;
  metadata?: any;
  created_at?: string;
}

export type {
  // Common query parameters
  ListQuerySchema as ListQuery,
} from '~/api/schemas';

// SDK-specific configuration types
export interface ClientConfig {
  baseUrl: string;
  sessionId?: string;
  headers?: Record<string, string>;
}

export interface AuthenticatedClientConfig extends ClientConfig {
  sessionToken?: string;
}

// Response wrapper types that match API structure
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Error types - preserve HTTP status codes from Effect errors
export interface ApiError {
  message: string;
  status: number;
  code: string;
  details?: any;
}

export interface ValidationError extends ApiError {
  status: 400;
  code: 'VALIDATION_ERROR';
  details: Record<string, string[]>;
}

export interface NotFoundError extends ApiError {
  status: 404;
  code: 'NOT_FOUND';
  resource: string;
  id: string;
}

export interface UnauthorizedError extends ApiError {
  status: 401;
  code: 'UNAUTHORIZED';
  reason:
    | 'missing_session'
    | 'invalid_session'
    | 'expired_session'
    | 'auth_service_error';
}
