import { api } from '@/lib/api';
import {
  CreateEventRequest,
  Event,
  EventWithDetails,
  UpdateEventRequest,
} from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface EventsResponse {
  success: boolean;
  data: Event[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface GetEventsParams {
  page?: number;
  limit?: number;
  upcoming?: boolean;
}

const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (params: GetEventsParams) => [...eventKeys.lists(), params] as const,
  details: () => [...eventKeys.all, 'details'] as const,
  detail: (id: number) => [...eventKeys.details(), id] as const,
};

export function useEvents(params: GetEventsParams = {}) {
  return useQuery({
    queryKey: eventKeys.list(params),
    queryFn: async (): Promise<EventsResponse> => {
      const response = await api.get('/events', { params });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => ({
      events: data.data,
      pagination: data.pagination,
    }),
  });
}

export function useEventDetails(id: number, enabled: boolean = true) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: async (): Promise<EventWithDetails> => {
      const response = await api.get(`/events/${id}`);
      return response.data;
    },
    enabled: enabled && id > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventData: CreateEventRequest) => {
      const response = await api.post('/events', eventData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventData: UpdateEventRequest) => {
      const response = await api.put(`/events/${eventData.id}`, eventData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: number) => {
      const response = await api.delete(`/events/${eventId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}
