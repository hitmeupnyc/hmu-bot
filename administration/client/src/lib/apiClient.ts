import type { paths, operations } from 'api-server/types';
import createClient from 'openapi-fetch';

// Re-export paths for convenience
export type { paths as rawApiPaths_USE_ONLY_WITH_AUTHORIZATION };

// Create the typed client
export const apiClient = createClient<paths>({
  baseUrl: process.env.API_BASE_URL || 'http://localhost:5173',
});

// Member API Types
export type MemberListParams = paths['/api/members']['get']['parameters'];
export type MemberCreateBody =
  paths['/api/members']['post']['requestBody']['content']['application/json'];
export type MemberUpdateBody =
  paths['/api/members/{id}']['put']['requestBody']['content']['application/json'];
export type MemberFlagsParams =
  paths['/api/members/{id}/flags']['get']['parameters'];
export type MemberGrantFlagBody =
  paths['/api/members/{id}/flags']['post']['requestBody']['content']['application/json'];

// Event API Types
export type EventListParams = paths['/api/events']['get']['parameters'];
export type EventCreateBody =
  paths['/api/events']['post']['requestBody']['content']['application/json'];
export type EventUpdateBody =
  paths['/api/events/{id}']['put']['requestBody']['content']['application/json'];
export type EventFlagsParams =
  paths['/api/events/{id}/flags']['get']['parameters'];

// Flag API Types
export type FlagListParams = paths['/api/flags']['get']['parameters'];
export type FlagBulkBody =
  paths['/api/flags/bulk']['post']['requestBody']['content']['application/json'];
export type FlagMembersParams =
  paths['/api/flags/{flagId}/members']['get']['parameters'];

// Audit API Types
export type AuditListParams = paths['/api/audit']['get']['parameters'];

// Common mutation parameter types for convenience
export type MutationWithId<TBody> = { id: number } & TBody;
export type MutationWithMemberId<TBody> = { memberId: string } & TBody;
export type MutationWithEventId<TBody> = { eventId: string } & TBody;
export type FlagMutation = {
  memberId: string;
  flagId: string;
  reason?: string;
};

// ============================================================================
// RESPONSE TYPES (what we get from API)
// ============================================================================

export type MemberResponse = operations['members.read']['responses']['200']['content']['application/json'];
export type EventResponse = operations['events.read']['responses']['200']['content']['application/json'];

// List response types
export type MemberListResponse = operations['members.list']['responses']['200']['content']['application/json'];
export type EventListResponse = operations['events.list']['responses']['200']['content']['application/json'];

// ============================================================================
// DOMAIN MODELS (used throughout the app)
// ============================================================================

export type Member = MemberResponse;
// Extend Event type with frontend-expected fields (until backend is updated)
export type Event = EventResponse & {
  start_datetime?: string;
  end_datetime?: string;
  max_capacity?: number;
  eventbrite_url?: string;
};

// Extract individual items from list responses
export type MemberFromList = MemberListResponse['data'][0];
export type EventFromList = EventListResponse['data'][0];

// Form data types (these already exist as request body types)
export type MemberFormData = MemberCreateBody & {
  is_professional_affiliate?: boolean;
};
export type EventFormData = EventCreateBody & {
  start_datetime?: string;
  end_datetime?: string;
  max_capacity?: number;
  is_public?: boolean;
};

// ============================================================================
// ADDITIONAL TYPES (for backwards compatibility and frontend-specific needs)
// ============================================================================

// For events with additional details (if needed by components)
export type EventWithDetails = Event & {
  // Add any additional fields that might be needed
  attendance?: EventAttendance[];
  volunteers?: EventVolunteer[];
};

// These may need to be defined based on actual backend implementation
export type EventAttendance = {
  id: number;
  event_id: number;
  member_id: number;
  attended: boolean;
  created_at: string;
};

export type EventVolunteer = {
  id: number;
  event_id: number;
  member_id: number;
  role: string;
  created_at: string;
};

// Application form data (for CSV imports and forms)
export type ApplicationFormData = MemberCreateBody;
