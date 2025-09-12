import { useQuery } from '@tanstack/react-query';
import { sdk } from '../lib/sdk';

// Type extraction from SDK
type GetAuditParams = Parameters<typeof sdk.audit.list>[0];

// Query key factory for consistent cache management
const auditKeys = {
  all: ['audit'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  list: (params: GetAuditParams) => [...auditKeys.lists(), params] as const,
};

// Query hooks
export function useAuditLogs(params: GetAuditParams) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => sdk.audit.list(params),
    staleTime: 5 * 60 * 1000,
  });
}