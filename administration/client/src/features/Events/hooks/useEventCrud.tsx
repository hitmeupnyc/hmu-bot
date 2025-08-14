import { useNavigate } from 'react-router-dom';

import {
  useCreateEvent,
  useDeleteEvent,
  useUpdateEvent,
} from '@/hooks/useEvents';
import { Event, EventFormData } from '@/types';

export function useEventCrud() {
  const navigate = useNavigate();

  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const handleDeleteEvent = async (event: Event) => {
    if (!confirm(`Are you sure you want to delete "${event.name}"?`)) {
      return;
    }

    try {
      await deleteEvent.mutateAsync(event.id);
    } catch (error) {
      console.error('Failed to delete event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  const handleFormSubmit = async (
    formData: EventFormData,
    editingEvent: Event | null,
    onSuccess: () => void
  ) => {
    const eventData = {
      name: formData.name,
      description: formData.description || undefined,
      start_datetime: formData.start_datetime,
      end_datetime: formData.end_datetime,
      is_public: formData.is_public,
      max_capacity: formData.max_capacity
        ? parseInt(formData.max_capacity)
        : undefined,
    };

    try {
      if (editingEvent) {
        await updateEvent.mutateAsync({
          id: editingEvent.id,
          ...eventData,
        });
        onSuccess();
      } else {
        const result = await createEvent.mutateAsync(eventData);
        onSuccess();
        // Redirect to the newly created event details page
        navigate(`/events/${result.data.id}`);
      }
    } catch (error) {
      console.error('Failed to save event:', error);
      alert('Failed to save event. Please try again.');
    }
  };

  return {
    handleDeleteEvent,
    handleFormSubmit,
    isCreatePending: createEvent.isPending,
    isUpdatePending: updateEvent.isPending,
    isDeletePending: deleteEvent.isPending,
    isFormLoading: createEvent.isPending || updateEvent.isPending,
  };
}
