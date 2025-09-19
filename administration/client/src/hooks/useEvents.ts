import {
  apiClient,
  type EventCreateBody,
  type EventFlagsParams,
  type EventListParams,
  type EventUpdateBody,
  type MutationWithId,
} from '@/lib/apiClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Query key factory for consistent cache management
const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (params: EventListParams) => [...eventKeys.lists(), params] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (id: number) => [...eventKeys.details(), id] as const,
  flags: () => [...eventKeys.all, 'flags'] as const,
  eventFlags: (eventId: number) => [...eventKeys.flags(), eventId] as const,
};

// Query hooks
export function useEvents(params: EventListParams) {
  return useQuery({
    queryKey: eventKeys.list(params),
    queryFn: () => apiClient.GET('/api/events', { params }),
    staleTime: 5 * 60 * 1000,
    select: ({ data }) => ({
      events: data?.data,
      pagination: {
        page: data?.page,
        limit: data?.limit,
        total: data?.total,
        totalPages: data?.totalPages,
      },
    }),
  });
}

export function useEvent(id: number) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () =>
      apiClient.GET('/api/events/{id}', {
        params: { path: { id: id.toString() } },
      }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useEventFlags(params: EventFlagsParams) {
  return useQuery({
    queryKey: eventKeys.eventFlags(Number(params.path.id)),
    queryFn: () => apiClient.GET('/api/events/{id}/flags', { params }),
    staleTime: 5 * 60 * 1000,
  });
}

// Mutation hooks
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: EventCreateBody) =>
      apiClient.POST('/api/events', { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MutationWithId<EventUpdateBody>) =>
      apiClient.PUT('/api/events/{id}', {
        params: { path: { id: data.id.toString() } },
        body: data,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: eventKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      apiClient.DELETE('/api/events/{id}', {
        params: { path: { id: id.toString() } },
      }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: eventKeys.detail(id),
      });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

// TODO: Event flag grant/revoke operations may not be implemented in the API yet
