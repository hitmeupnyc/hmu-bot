import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Member, MemberFormData } from '@/types';

export interface MembersResponse {
  success: boolean;
  data: Member[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MemberResponse {
  success: boolean;
  data: Member;
}

export interface CreateMemberResponse {
  success: boolean;
  data: Member;
  message: string;
}

interface GetMembersParams {
  page?: number;
  limit?: number;
  search?: string;
}

// Query key factory for consistent cache management
export const memberKeys = {
  all: ['members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (params: GetMembersParams) => [...memberKeys.lists(), params] as const,
  details: () => [...memberKeys.all, 'detail'] as const,
  detail: (id: number) => [...memberKeys.details(), id] as const,
};

/**
 * Hook to fetch paginated members list with search
 */
export function useMembers(params: GetMembersParams = {}) {
  return useQuery({
    queryKey: memberKeys.list(params),
    queryFn: async (): Promise<MembersResponse> => {
      const response = await api.get('/members', { params });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => ({
      members: data.data,
      pagination: data.pagination,
    }),
  });
}

/**
 * Hook to fetch a single member by ID
 */
export function useMember(id: number, enabled = true) {
  return useQuery({
    queryKey: memberKeys.detail(id),
    queryFn: async (): Promise<Member> => {
      const response = await api.get<MemberResponse>(`/members/${id}`);
      return response.data.data;
    },
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to create a new member
 */
export function useCreateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberData: MemberFormData): Promise<Member> => {
      const response = await api.post<CreateMemberResponse>('/members', memberData);
      return response.data.data;
    },
    onSuccess: (newMember) => {
      // Invalidate and refetch members list
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
      
      // Add the new member to the cache
      queryClient.setQueryData(memberKeys.detail(newMember.id), newMember);
    },
  });
}

/**
 * Hook to update an existing member
 */
export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...memberData }: MemberFormData & { id: number }): Promise<Member> => {
      const response = await api.put<MemberResponse>(`/members/${id}`, memberData);
      return response.data.data;
    },
    onSuccess: (updatedMember) => {
      // Update the member in the cache
      queryClient.setQueryData(memberKeys.detail(updatedMember.id), updatedMember);
      
      // Invalidate and refetch members list to ensure consistency
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}

/**
 * Hook to delete a member
 */
export function useDeleteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await api.delete(`/members/${id}`);
    },
    onSuccess: (_, deletedMemberId) => {
      // Remove the member from the cache
      queryClient.removeQueries({ queryKey: memberKeys.detail(deletedMemberId) });
      
      // Invalidate and refetch members list
      queryClient.invalidateQueries({ queryKey: memberKeys.lists() });
    },
  });
}

/**
 * Hook to prefetch a member (useful for preloading when hovering over links)
 */
export function usePrefetchMember() {
  const queryClient = useQueryClient();

  return (id: number) => {
    queryClient.prefetchQuery({
      queryKey: memberKeys.detail(id),
      queryFn: async (): Promise<Member> => {
        const response = await api.get<MemberResponse>(`/members/${id}`);
        return response.data.data;
      },
      staleTime: 5 * 60 * 1000,
    });
  };
}