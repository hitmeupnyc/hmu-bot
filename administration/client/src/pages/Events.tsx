import { PlusIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { EventFormModal, EventGrid } from '../features/Events/components';
import { useEventCrud } from '../features/Events/hooks/useEventCrud';
import { useEvents } from '../hooks/useEvents';
import { Event } from '../types';

type EventFilter = 'upcoming' | 'past' | 'all';

export function Events() {
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState<EventFilter>('upcoming');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // React Query hooks
  const { data, isLoading } = useEvents(
    filter === 'upcoming'
      ? { upcoming: true }
      : filter === 'past'
        ? { upcoming: false }
        : {}
  );

  // CRUD operations
  const { handleDeleteEvent, handleFormSubmit, isFormLoading } = useEventCrud();

  // Filter events client-side for 'past' filter since backend doesn't handle it
  const allEvents = data?.events || [];
  const events =
    filter === 'past'
      ? allEvents.filter((event) => new Date(event.end_datetime) < new Date())
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

  const handleViewEvent = (event: Event) => {
    navigate(`/events/${event.id}`);
  };

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
        onEdit={(event) => {
          setEditingEvent(event);
          setIsModalOpen(true);
        }}
        onDelete={handleDeleteEvent}
        onView={handleViewEvent}
        isEditPending={false}
        isDeletePending={false}
        filter={filter}
        onFilterChange={setFilter}
      />

      <EventFormModal
        isOpen={isModalOpen}
        editingEvent={editingEvent}
        onSubmit={async (formData: any) => {
          await handleFormSubmit(formData, editingEvent, () => {
            setIsModalOpen(false);
            setEditingEvent(null);
          });
        }}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEvent(null);
        }}
        isLoading={isFormLoading}
      />
    </div>
  );
}
