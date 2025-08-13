import { EventService } from '@/services/eventService';
import { CreateEventMarketingRequest, CreateVolunteerRequest } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function useEventCrud(eventId: number) {
  const [marketingLoading, setMarketingLoading] = useState(false);
  const [volunteerLoading, setVolunteerLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleMarketingSubmit = async (data: CreateEventMarketingRequest) => {
    try {
      setMarketingLoading(true);
      await EventService.createEventMarketing(eventId, data);
      // Invalidate and refetch event details
      queryClient.invalidateQueries({
        queryKey: ['events', 'details', eventId],
      });
    } catch (error) {
      console.error('Failed to save marketing:', error);
      alert('Failed to save marketing content. Please try again.');
    } finally {
      setMarketingLoading(false);
    }
  };

  const handleVolunteerSubmit = async (data: CreateVolunteerRequest) => {
    try {
      setVolunteerLoading(true);
      await EventService.addVolunteer(eventId, data);
      // Invalidate and refetch event details
      queryClient.invalidateQueries({
        queryKey: ['events', 'details', eventId],
      });
    } catch (error) {
      console.error('Failed to add volunteer:', error);
      alert('Failed to add volunteer. Please try again.');
    } finally {
      setVolunteerLoading(false);
    }
  };

  return {
    marketingLoading,
    volunteerLoading,
    handleMarketingSubmit,
    handleVolunteerSubmit,
  };
}
