import { apiClient, paths } from '@/lib/apiClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type FlagListParams = paths['/api/flags']['get']['parameters'];
type BulkFlagsParams = paths['/api/flags/bulk']['post']['requestBody']['content']['application/json'];

// Query key factory for consistent cache management
const flagKeys = {
  all: ['flags'] as const,
  lists: () => [...flagKeys.all, 'list'] as const,
  list: (params: FlagListParams) => [...flagKeys.lists(), params] as const,
  bulk: () => [...flagKeys.all, 'bulk'] as const,
};

// Query hooks
export function useFlags(params: FlagListParams) {
  return useQuery({
    queryKey: flagKeys.list(params),
    queryFn: () => apiClient.GET('/api/flags', { params }),
    staleTime: 5 * 60 * 1000,
    select: ({ data }) => ({
      flags: data?.data,
      pagination: {
        page: data?.page,
        limit: data?.limit,
        total: data?.total,
        totalPages: data?.totalPages,
      },
    }),
  });
}

// Mutation hooks
export function useBulkFlags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: BulkFlagsParams) => apiClient.POST('/api/flags/bulk', { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flagKeys.lists() });
    },
  });
}

// Re-export from other hooks for backward compatibility
export {
  useFlagMembers,
  useGrantMemberFlag as useGrantFlag,
  useMemberFlags,
  useRevokeMemberFlag as useRevokeFlag,
} from './useMembers';

// TODO: Extract from SDK
export type Flag = any;
export type FlagMember = any;
export type MemberFlag = any;

// Placeholder for missing hooks
export function useMemberPermissions() {
  // TODO: Implement based on actual requirements
  return { data: [], isLoading: false };
}

export function useBulkGrantFlags() {
  // TODO: Implement based on actual requirements
  return { mutateAsync: async () => {}, isPending: false };
}

export function useProcessExpiredFlags() {
  // TODO: Implement based on actual requirements
  return { mutateAsync: async () => {}, isPending: false };
}
