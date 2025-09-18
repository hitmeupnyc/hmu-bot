import { useQuery } from '@tanstack/react-query';
import { AuditLog } from 'api-server/types';

// Type extraction from SDK
type GetAuditParams = AuditLog['list']['params'];

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
    queryFn: () => fetch('/api/audit'),
    staleTime: 5 * 60 * 1000,
  });
}
