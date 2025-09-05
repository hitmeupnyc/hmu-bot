import { Event, EventAttendance, EventVolunteer } from '@/types';

interface OverviewProps {
  event: Event;
  volunteers: EventVolunteer[];
  attendance: EventAttendance[];
}

export function Overview({ event }: OverviewProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-4 rounded-md"></div>

        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="font-medium text-gray-900 mb-2">Eventbrite Info</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Capacity:</dt>
              <dd className="font-medium">{event.name}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
