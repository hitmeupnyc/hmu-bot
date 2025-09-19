import { apiClient, type AuditListParams } from '@/lib/apiClient';
import { useQuery } from '@tanstack/react-query';

// Query key factory for consistent cache management
const auditKeys = {
  all: ['audit'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  list: (params: AuditListParams) => [...auditKeys.lists(), params] as const,
};

// Query hooks
export function useAuditLogs(params: AuditListParams) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => apiClient.GET('/api/audit', { params }),
    staleTime: 5 * 60 * 1000,
    select: ({ data }) => ({
      logs: data?.data,
      pagination: {
        offset: data?.offset,
        limit: data?.limit,
        total: data?.total,
      },
    }),
  });
}
