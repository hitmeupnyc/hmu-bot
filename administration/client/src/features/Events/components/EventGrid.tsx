import { CalendarIcon } from '@heroicons/react/24/outline';
import { Event } from '../../../types';
import { EventTableRow } from './EventTableRow';

type EventFilter = 'upcoming' | 'past' | 'all';

interface EventGridProps {
  events: Event[];
  isLoading: boolean;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
  onView: (event: Event) => void;
  isEditPending: boolean;
  isDeletePending: boolean;
  filter: EventFilter;
  onFilterChange: (filter: EventFilter) => void;
  children?: React.ReactNode;
}

export function EventGrid({
  events,
  isLoading,
  onEdit,
  onDelete,
  onView,
  isEditPending,
  isDeletePending,
  filter,
  onFilterChange,
  children,
}: EventGridProps) {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => onFilterChange('upcoming')}
            className={`px-4 py-2 rounded-md ${
              filter === 'upcoming' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Upcoming
          </button>
          <button 
            onClick={() => onFilterChange('past')}
            className={`px-4 py-2 rounded-md ${
              filter === 'past' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Past
          </button>
          <button 
            onClick={() => onFilterChange('all')}
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

      {isLoading ? (
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
                <EventTableRow
                  key={event.id}
                  event={event}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onView={onView}
                  isEditPending={isEditPending}
                  isDeletePending={isDeletePending}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {children}
    </div>
  );
}