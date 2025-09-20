import {
  apiClient,
  MemberCreateNoteBody,
  type FlagMembersParams,
  type FlagMutation,
  type MemberCreateBody,
  type MemberFlagsParams,
  type MemberGrantFlagBody,
  type MemberListParams,
  type MemberUpdateBody,
  type MutationWithId,
} from '@/lib/apiClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Query key factory for consistent cache management
const memberKeys = {
  all: ['members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (params: MemberListParams) => [...memberKeys.lists(), params] as const,
  details: () => [...memberKeys.all, 'detail'] as const,
  detail: (id: number) => [...memberKeys.details(), id] as const,
  memberLogs: (id: number) => [...memberKeys.all, 'audit_log', id] as const,
  flags: () => [...memberKeys.all, 'flags'] as const,
  memberFlags: (memberId: number) => [...memberKeys.flags(), memberId] as const,
  flagMembers: (flagId: string) =>
    [...memberKeys.flags(), 'flag', flagId] as const,
};

// Query hooks
export function useMembers(params: MemberListParams) {
  return useQuery({
    queryKey: memberKeys.list(params),
    queryFn: () => apiClient.GET('/api/members', { params }),
    staleTime: 5 * 60 * 1000,
    select: ({ data }) => ({
      members: data?.data,
      pagination: {
        page: data?.page,
        limit: data?.limit,
        total: data?.total,
        totalPages: data?.totalPages,
      },
    }),
  });
}

export function useMember(id: number) {
  return useQuery({
    queryKey: memberKeys.detail(id),
    queryFn: () =>
      apiClient.GET('/api/members/{id}', {
        params: { path: { id: id.toString() } },
      }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMemberFlags(params: MemberFlagsParams) {
  return useQuery({
    queryKey: memberKeys.memberFlags(Number(params.path.id)),
    queryFn: () => apiClient.GET('/api/members/{id}/flags', { params }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFlagMembers(params: FlagMembersParams) {
  return useQuery({
    queryKey: memberKeys.flagMembers(params.path.flagId),
    queryFn: () => apiClient.GET('/api/flags/{flagId}/members', { params }),
    staleTime: 5 * 60 * 1000,
  });
}

// Mutation hooks
export function useCreateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: MemberCreateBody) =>
      apiClient.POST('/api/members', { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MutationWithId<MemberUpdateBody>) =>
      apiClient.PUT('/api/members/{id}', {
        params: { path: { id: data.id.toString() } },
        body: data,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      apiClient.DELETE('/api/members/{id}', {
        params: { path: { id: id.toString() } },
      }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.detail(id),
      });
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}

export function useGrantMemberFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      memberId,
      ...body
    }: { memberId: string } & MemberGrantFlagBody) =>
      apiClient.POST('/api/members/{id}/flags', {
        params: { path: { id: memberId } },
        body,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.memberFlags(Number(variables.memberId)),
      });
      queryClient.invalidateQueries({
        queryKey: memberKeys.flagMembers(variables.flag_id),
      });
    },
  });
}

export function useRevokeMemberFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, flagId, reason }: FlagMutation) =>
      apiClient.DELETE('/api/members/{id}/flags/{flagId}', {
        params: { path: { id: memberId, flagId } },
        body: reason ? { reason } : {},
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.memberFlags(Number(variables.memberId)),
      });
      queryClient.invalidateQueries({
        queryKey: memberKeys.flagMembers(variables.flagId),
      });
    },
  });
}

export function useCreateMemberNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: MutationWithId<MemberCreateNoteBody>) =>
      apiClient.POST('/api/members/{id}/note', {
        params: { path: { id: id.toString() } },
        body,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.memberLogs(Number(variables.id)),
      });
    },
  });
}
