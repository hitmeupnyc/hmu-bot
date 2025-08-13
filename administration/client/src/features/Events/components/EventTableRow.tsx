import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { Event } from '../../../types';
import { EventStatusBadge } from './EventStatusBadge';

interface EventTableRowProps {
  event: Event;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
  isEditPending: boolean;
  isDeletePending: boolean;
}

export function EventTableRow({
  event,
  onEdit,
  onDelete,
  isEditPending,
  isDeletePending,
}: EventTableRowProps) {
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4">
        <div>
          <div className="text-sm font-medium text-gray-900">
            <Link
              className="text-blue-600 hover:text-blue-900"
              to={`/events/${event.id}`}
            >
              {event.name}
            </Link>
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
        <EventStatusBadge event={event} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(event)}
            disabled={isEditPending}
            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
            title="Edit Event"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(event)}
            disabled={isDeletePending}
            className="text-red-600 hover:text-red-900 disabled:opacity-50"
            title="Delete Event"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
