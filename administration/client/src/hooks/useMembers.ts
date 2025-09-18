import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Members } from 'api-server/types';

// Type extraction from SDK
type GetMembers = Members['list'];
type CreateMember = Members['create'];
type UpdateMember = Members['update'];
type DeleteMember = Members['delete'];
type GetMemberFlags = Members['listFlags'];
type GrantMemberFlag = Members['grantFlag'];
type RevokeMemberFlag = Members['revokeFlag'];
type FlagMembers = Members['flagMembers'];

// Query key factory for consistent cache management
const memberKeys = {
  all: ['members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (params: GetMembers['params']) =>
    [...memberKeys.lists(), params] as const,
  details: () => [...memberKeys.all, 'detail'] as const,
  detail: (id: number) => [...memberKeys.details(), id] as const,
  flags: () => [...memberKeys.all, 'flags'] as const,
  memberFlags: (memberId: number) => [...memberKeys.flags(), memberId] as const,
  flagMembers: (flagId: string) =>
    [...memberKeys.flags(), 'flag', flagId] as const,
};

// Query hooks
export function useMembers(params: GetMembers['params']) {
  return useQuery({
    queryKey: memberKeys.list(params),
    queryFn: () =>
      fetch(
        `/api/members/?${new URLSearchParams(
          Object.entries(params).map(([l, r]) => [l, r ? r.toString() : r])
        )}`
      ),
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
    queryFn: () => fetch(`/api/members/${id}`),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMemberFlags(params: GetMemberFlags['params']) {
  return useQuery({
    queryKey: memberKeys.memberFlags(Number(params.path.id)),
    queryFn: () => fetch('/api/members/'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFlagMembers(params: FlagMembers) {
  return useQuery({
    queryKey: memberKeys.flagMembers(params.path.flagId),
    queryFn: () => fetch('/api/members/'),
    staleTime: 5 * 60 * 1000,
  });
}

// Mutation hooks
export function useCreateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMemberParams) => fetch('/api/members/'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateMemberParams) => fetch('/api/members/'),
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
    mutationFn: (params: DeleteMemberParams) => fetch('/api/members/'),
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
    mutationFn: (params: GrantMemberFlagParams) => fetch('/api/members/'),
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
    mutationFn: (params: RevokeMemberFlagParams) => fetch('/api/members/'),
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
