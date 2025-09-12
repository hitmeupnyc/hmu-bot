import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sdk } from '../lib/sdk';

// Type extraction from SDK
type GetFlagsParams = Parameters<typeof sdk.flags.list>[0];
type BulkFlagsParams = Parameters<typeof sdk.flags.bulk>[0];

// Query key factory for consistent cache management
const flagKeys = {
  all: ['flags'] as const,
  lists: () => [...flagKeys.all, 'list'] as const,
  list: (params: GetFlagsParams) => [...flagKeys.lists(), params] as const,
  bulk: () => [...flagKeys.all, 'bulk'] as const,
};

// Query hooks
export function useFlags(params: GetFlagsParams) {
  return useQuery({
    queryKey: flagKeys.list(params),
    queryFn: () => sdk.flags.list(params),
    staleTime: 5 * 60 * 1000,
  });
}

// Mutation hooks
export function useBulkFlags() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: BulkFlagsParams) => sdk.flags.bulk(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flagKeys.lists() });
    },
  });
}

// Re-export from other hooks for backward compatibility
export { 
  useRevokeMemberFlag as useRevokeFlag, 
  useGrantMemberFlag as useGrantFlag,
  useMemberFlags,
  useFlagMembers
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