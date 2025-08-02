import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Event } from '@/types';

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