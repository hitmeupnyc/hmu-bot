import { Event } from '@/types';

interface EventStatusBadgeProps {
  event: Event;
}

export function EventStatusBadge({ event }: EventStatusBadgeProps) {
  const getEventStatus = (event: Event) => {
    const now = new Date();
    const start = new Date(event.start_datetime);
    const end = new Date(event.end_datetime);

    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'ongoing';
    return 'past';
  };

  const status = getEventStatus(event);
  const isActive = event.flags & 1;
  const isPublic = event.flags & 2;

  return (
    <div className="flex space-x-1">
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
}
