import { EventWithDetails, EventVolunteer, EventAttendance } from '@/types';

interface OverviewProps {
  eventDetails: EventWithDetails;
  volunteers: EventVolunteer[];
  attendance: EventAttendance[];
}

export function Overview({ eventDetails, volunteers, attendance }: OverviewProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="font-medium text-gray-900 mb-2">Event Statistics</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Total Registrations:</dt>
              <dd className="font-medium">{attendance.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Volunteers:</dt>
              <dd className="font-medium">{volunteers.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Checked In:</dt>
              <dd className="font-medium">
                {attendance.filter(a => a.check_in_method).length}
              </dd>
            </div>
          </dl>
        </div>

        {eventDetails.eventbrite_event && (
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="font-medium text-gray-900 mb-2">Eventbrite Info</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Capacity:</dt>
                <dd className="font-medium">{eventDetails.eventbrite_event.capacity || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Last Synced:</dt>
                <dd className="font-medium">
                  {new Date(eventDetails.eventbrite_event.last_synced_at).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}