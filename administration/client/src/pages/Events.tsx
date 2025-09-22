import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  EventFormModal,
  EventGrid,
  EventTableRow,
} from '@/features/Events/components';
import { useCreateEvent, useUpdateEvent, useDeleteEvent } from '@/hooks/useEvents';
import { useEvents } from '@/hooks/useEvents';
// TODO: Extract from SDK
type Event = any;
import { PlusIcon } from '@heroicons/react/24/outline';

type EventFilter = 'upcoming' | 'past' | 'all';

export function Events() {
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState<EventFilter>('upcoming');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // React Query hooks
  const { data, isLoading } = useEvents({
    query: {
      limit: '20',
      page: '1',
      sortOrder: 'desc',
    }
  });

  // CRUD operations  
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  
  const handleDeleteEvent = async (event: any) => {
    if (confirm(`Delete event "${event.title}"?`)) {
      try {
        await deleteEvent.mutateAsync(event.id);
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };
  
  const handleFormSubmit = async (formData: any) => {
    try {
      if (editingEvent) {
        await updateEvent.mutateAsync({
          id: editingEvent.id,
          ...formData
        });
      } else {
        await createEvent.mutateAsync(formData);
      }
      setIsModalOpen(false);
      setEditingEvent(null);
    } catch (error) {
      console.error('Form submit failed:', error);
    }
  };

  // Filter events client-side for 'past' filter since backend doesn't handle it
  const allEvents = data?.events || [];
  const events =
    filter === 'past'
      ? allEvents.filter((event) => event.id && event.id < 1000) // Simple past filter placeholder
      : allEvents;
  const loading = isLoading;

  // Handle edit event from EventDetails page
  useEffect(() => {
    const state = location.state as { editEventId?: number } | null;
    if (state?.editEventId && events.length > 0) {
      const eventToEdit = events.find(
        (event) => event.id === state.editEventId
      );
      if (eventToEdit) {
        setEditingEvent(eventToEdit);
        setIsModalOpen(true);
        // Clear the state to prevent re-triggering
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [events, location.state, navigate, location.pathname]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Events</h1>
        <button
          onClick={() => {
            setEditingEvent(null);
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Event
        </button>
      </div>

      <EventGrid
        events={events}
        isLoading={loading}
        filter={filter}
        onFilterChange={setFilter}
      >
        {events.map((event) => (
          <EventTableRow
            key={event.id}
            event={event}
            onEdit={(event) => {
              setEditingEvent(event);
              setIsModalOpen(true);
            }}
            onDelete={handleDeleteEvent}
            isEditPending={false}
            isDeletePending={false}
          />
        ))}
      </EventGrid>

      <EventFormModal
        isOpen={isModalOpen}
        editingEvent={editingEvent}
        onSubmit={async (formData: any) => {
          await handleFormSubmit(formData);
        }}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEvent(null);
        }}
        isLoading={editingEvent ? updateEvent.isPending : createEvent.isPending}
      />
    </div>
  );
}
