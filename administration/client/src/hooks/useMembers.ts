import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sdk } from '../lib/sdk';

// Type extraction from SDK
type GetMembersParams = Parameters<typeof sdk.members.list>[0];
type CreateMemberParams = Parameters<typeof sdk.members.create>[0];
type UpdateMemberParams = Parameters<typeof sdk.members.update>[0];
type DeleteMemberParams = Parameters<typeof sdk.members.delete>[0];
type GetMemberFlagsParams = Parameters<typeof sdk.members.listFlags>[0];
type GrantMemberFlagParams = Parameters<typeof sdk.members.grantFlag>[0];
type RevokeMemberFlagParams = Parameters<typeof sdk.members.revokeFlag>[0];
type FlagMembersParams = Parameters<typeof sdk.members.flagMembers>[0];

// Query key factory for consistent cache management
const memberKeys = {
  all: ['members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (params: GetMembersParams) => [...memberKeys.lists(), params] as const,
  details: () => [...memberKeys.all, 'detail'] as const,
  detail: (id: number) => [...memberKeys.details(), id] as const,
  flags: () => [...memberKeys.all, 'flags'] as const,
  memberFlags: (memberId: number) => [...memberKeys.flags(), memberId] as const,
  flagMembers: (flagId: string) =>
    [...memberKeys.flags(), 'flag', flagId] as const,
};

// Query hooks
export function useMembers(params: GetMembersParams) {
  return useQuery({
    queryKey: memberKeys.list(params),
    queryFn: async () => {
      const result = await sdk.members.list(params);
      // SDK returns a single response object, not a tuple
      return result;
    },
    staleTime: 5 * 60 * 1000,
    select: (data) => ({
      members: data.data,
      pagination: {
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: data.totalPages,
      },
    }),
  });
}

export function useMember(id: number) {
  return useQuery({
    queryKey: memberKeys.detail(id),
    queryFn: () => sdk.members.read({ path: { id } }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMemberFlags(params: GetMemberFlagsParams) {
  return useQuery({
    queryKey: memberKeys.memberFlags(Number(params.path.id)),
    queryFn: () => sdk.members.listFlags(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFlagMembers(params: FlagMembersParams) {
  return useQuery({
    queryKey: memberKeys.flagMembers(params.path.flagId),
    queryFn: () => sdk.members.flagMembers(params),
    staleTime: 5 * 60 * 1000,
  });
}

// Mutation hooks
export function useCreateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMemberParams) => sdk.members.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateMemberParams) => sdk.members.update(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.detail(variables.payload.id),
      });
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: DeleteMemberParams) => sdk.members.delete(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.detail(variables.path.id),
      });
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}

export function useGrantMemberFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: GrantMemberFlagParams) =>
      sdk.members.grantFlag(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.memberFlags(Number(variables.path.id)),
      });
      queryClient.invalidateQueries({
        queryKey: memberKeys.flagMembers(variables.payload.flag_id),
      });
    },
  });
}

export function useRevokeMemberFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: RevokeMemberFlagParams) =>
      sdk.members.revokeFlag(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.memberFlags(Number(variables.path.id)),
      });
      queryClient.invalidateQueries({
        queryKey: memberKeys.flagMembers(variables.path.flagId),
      });
    },
  });
}
