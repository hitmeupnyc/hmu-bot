import type { paths } from 'api-server/types';
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
