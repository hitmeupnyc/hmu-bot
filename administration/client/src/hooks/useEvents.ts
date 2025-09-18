import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Events } from 'api-server/types';

// Type extraction from SDK
type GetEventsParams = Events['list'];
type CreateEventParams = Events['create'];
type UpdateEventParams = Events['update'];
type DeleteEventParams = Events['delete'];
type GetEventFlagsParams = Events['flags'];
type GrantEventFlagParams = Events['grantFlag'];
type RevokeEventFlagParams = Events['revokeFlag'];

// Query key factory for consistent cache management
const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (params: GetEventsParams) => [...eventKeys.lists(), params] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (id: number) => [...eventKeys.details(), id] as const,
  flags: () => [...eventKeys.all, 'flags'] as const,
  eventFlags: (eventId: number) => [...eventKeys.flags(), eventId] as const,
};

// Query hooks
export function useEvents(params: GetEventsParams) {
  return useQuery({
    queryKey: eventKeys.list(params),
    queryFn: () => sdk.events.list(params),
    staleTime: 5 * 60 * 1000,
    select: (response) => {
      const data = response[0];
      return {
        events: data.data,
        pagination: {
          page: data.page,
          limit: data.limit,
          total: data.total,
          totalPages: data.totalPages,
        },
      };
    },
  });
}

export function useEvent(id: number) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => sdk.events.read({ path: { id } }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useEventFlags(params: GetEventFlagsParams) {
  return useQuery({
    queryKey: eventKeys.eventFlags(Number(params.path.id)),
    queryFn: () => sdk.events.flags(params),
    staleTime: 5 * 60 * 1000,
  });
}

// Mutation hooks
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEventParams) => sdk.events.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateEventParams) => sdk.events.update(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: eventKeys.detail(variables.path.id),
      });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: DeleteEventParams) => sdk.events.delete(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: eventKeys.detail(variables.path.id),
      });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

export function useGrantEventFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: GrantEventFlagParams) => sdk.events.grantFlag(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: eventKeys.eventFlags(Number(variables.path.id)),
      });
    },
  });
}

export function useRevokeEventFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: RevokeEventFlagParams) =>
      sdk.events.revokeFlag(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: eventKeys.eventFlags(Number(variables.path.id)),
      });
    },
  });
}
