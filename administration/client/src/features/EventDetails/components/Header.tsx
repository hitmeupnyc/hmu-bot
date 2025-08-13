import { Event, EventWithDetails } from '@/types';
import { ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/outline';
import { useMemo } from 'react';

interface HeaderProps {
  event: Event;
  eventDetails: EventWithDetails;
  onBack: () => void;
  onEdit: () => void;
}

export function Header({ event, eventDetails, onBack, onEdit }: HeaderProps) {
  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString();
  };

  const status = useMemo(() => {
    const now = new Date();
    const start = new Date(event.start_datetime);
    const end = new Date(event.end_datetime);

    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'ongoing';
    return 'past';
  }, [event.start_datetime, event.end_datetime]);

  const isActive = event.flags & 1;
  const isPublic = event.flags & 2;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Events
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {event.name}
            </h1>
            {event.description && (
              <p className="text-gray-600 mb-4">{event.description}</p>
            )}
            <div className="flex space-x-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  status === 'upcoming'
                    ? 'bg-blue-100 text-blue-800'
                    : status === 'ongoing'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                }`}
              >
                {status === 'upcoming'
                  ? 'Upcoming'
                  : status === 'ongoing'
                    ? 'Ongoing'
                    : 'Past'}
              </span>
              {isPublic && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  Public
                </span>
              )}
              {!isActive && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  Inactive
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onEdit}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit Event
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <span className="font-medium text-gray-700">Start:</span>
            <div className="text-gray-900">
              {formatDateTime(event.start_datetime)}
            </div>
          </div>
          <div>
            <span className="font-medium text-gray-700">End:</span>
            <div className="text-gray-900">
              {formatDateTime(event.end_datetime)}
            </div>
          </div>
          <div>
            <span className="font-medium text-gray-700">Capacity:</span>
            <div className="text-gray-900">
              {event.max_capacity || 'Unlimited'}
            </div>
          </div>
        </div>

        {eventDetails.eventbrite_link && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <span className="text-blue-800 font-medium">
              Eventbrite Integration:
            </span>
            <span className="text-blue-700 ml-2">
              Sync Status: {eventDetails.eventbrite_link.sync_status}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
