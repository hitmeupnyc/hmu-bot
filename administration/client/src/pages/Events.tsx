import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PlusIcon, PencilIcon, TrashIcon, CalendarIcon, EyeIcon } from '@heroicons/react/24/outline';
import { Event, EventFormData } from '../types';
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent } from '../hooks/useEvents';
import { Modal } from '../components/Modal';
import { EventForm } from '../components/EventForm';

type EventFilter = 'upcoming' | 'past' | 'all';

export function Events() {
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState<EventFilter>('upcoming');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  
  // React Query hooks
  const queryParams = filter === 'upcoming' ? { upcoming: true } : 
                     filter === 'past' ? { upcoming: false } : {};
  const { data, isLoading } = useEvents(queryParams);
  const createEventMutation = useCreateEvent();
  const updateEventMutation = useUpdateEvent();
  const deleteEventMutation = useDeleteEvent();
  
  // Filter events client-side for 'past' filter since backend doesn't handle it
  const allEvents = data?.events || [];
  const events = filter === 'past' 
    ? allEvents.filter(event => new Date(event.end_datetime) < new Date())
    : allEvents;
  const loading = isLoading;

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  // Handle edit event from EventDetails page
  useEffect(() => {
    const state = location.state as { editEventId?: number } | null;
    if (state?.editEventId && events.length > 0) {
      const eventToEdit = events.find(event => event.id === state.editEventId);
      if (eventToEdit) {
        handleEditEvent(eventToEdit);
        // Clear the state to prevent re-triggering
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [events, location.state, navigate, location.pathname, handleEditEvent]);

  const handleViewEvent = (event: Event) => {
    navigate(`/events/${event.id}`);
  };

  const handleDeleteEvent = async (event: Event) => {
    if (!confirm(`Are you sure you want to delete "${event.name}"?`)) {
      return;
    }

    try {
      await deleteEventMutation.mutateAsync(event.id);
    } catch (error) {
      console.error('Failed to delete event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  const handleFormSubmit = async (formData: EventFormData) => {
    const eventData = {
      name: formData.name,
      description: formData.description || undefined,
      start_datetime: formData.start_datetime,
      end_datetime: formData.end_datetime,
      is_public: formData.is_public,
      max_capacity: formData.max_capacity ? parseInt(formData.max_capacity) : undefined,
    };
    
    try {
      if (editingEvent) {
        await updateEventMutation.mutateAsync({
          id: editingEvent.id,
          ...eventData
        });
        setIsModalOpen(false);
        setEditingEvent(null);
      } else {
        const result = await createEventMutation.mutateAsync(eventData);
        setIsModalOpen(false);
        setEditingEvent(null);
        // Redirect to the newly created event details page
        navigate(`/events/${result.data.id}`);
      }
    } catch (error) {
      console.error('Failed to save event:', error);
      alert('Failed to save event. Please try again.');
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getEventStatus = (event: Event) => {
    const now = new Date();
    const start = new Date(event.start_datetime);
    const end = new Date(event.end_datetime);
    
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'ongoing';
    return 'past';
  };

  const getStatusBadge = (event: Event) => {
    const status = getEventStatus(event);
    const isActive = event.flags & 1;
    const isPublic = event.flags & 2;
    
    return (
      <div className="flex space-x-1">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
          status === 'ongoing' ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {status === 'upcoming' ? 'Upcoming' :
           status === 'ongoing' ? 'Ongoing' : 'Past'}
        </span>
        {isPublic && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            Public
          </span>
        )}
        {!isActive && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Inactive
          </span>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Events</h1>
        <button 
          onClick={handleCreateEvent}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Event
        </button>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setFilter('upcoming')}
              className={`px-4 py-2 rounded-md ${
                filter === 'upcoming' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Upcoming
            </button>
            <button 
              onClick={() => setFilter('past')}
              className={`px-4 py-2 rounded-md ${
                filter === 'past' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Past
            </button>
            <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md ${
                filter === 'all' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center text-gray-500">
            Loading events...
          </div>
        ) : events.length === 0 ? (
          <div className="p-6">
            <div className="text-center text-gray-500">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No events scheduled</h3>
              <p>Get started by creating your first event.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Capacity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {event.name}
                        </div>
                        {event.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {event.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div>Start: {formatDateTime(event.start_datetime)}</div>
                        <div>End: {formatDateTime(event.end_datetime)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {event.max_capacity || 'Unlimited'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(event)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewEvent(event)}
                          className="text-green-600 hover:text-green-900"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditEvent(event)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit Event"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Event"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEvent ? 'Edit Event' : 'Create New Event'}
      >
        <EventForm
          event={editingEvent || undefined}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsModalOpen(false)}
          isLoading={createEventMutation.isPending || updateEventMutation.isPending}
        />
      </Modal>
    </div>
  );
}

