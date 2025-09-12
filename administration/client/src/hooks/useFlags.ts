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