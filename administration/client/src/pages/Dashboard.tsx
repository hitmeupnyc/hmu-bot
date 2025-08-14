import { useEvents } from '@/hooks/useEvents';
import { useMembers } from '@/hooks/useMembers';

export function Dashboard() {
  const { data: membersData, isLoading: membersLoading } = useMembers({
    limit: 100,
  });
  const { data: eventsData, isLoading: eventsLoading } = useEvents({
    upcoming: true,
  });
  const { data: recentMembersData } = useMembers({ limit: 5 });

  const members = membersData?.members || [];
  const upcomingEvents = eventsData?.events || [];
  const recentMembers = recentMembersData?.members || [];

  const totalMembers = membersData?.pagination?.total || 0;
  const activeMembers = members.filter((member) => member.flags & 1).length;
  const upcomingEventsCount = upcomingEvents.length;

  const formatCount = (count: number, isLoading: boolean) => {
    return isLoading ? '--' : count.toString();
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div
          className="bg-white p-6 rounded-lg shadow"
          data-testid="stat-total-members"
        >
          <h3 className="text-lg font-semibold text-gray-900">Total Members</h3>
          <p
            className="text-3xl font-bold text-blue-600 mt-2"
            data-testid="stat-total-members-value"
          >
            {formatCount(totalMembers, membersLoading)}
          </p>
        </div>

        <div
          className="bg-white p-6 rounded-lg shadow"
          data-testid="stat-active-members"
        >
          <h3 className="text-lg font-semibold text-gray-900">
            Active Members
          </h3>
          <p
            className="text-3xl font-bold text-green-600 mt-2"
            data-testid="stat-active-members-value"
          >
            {formatCount(activeMembers, membersLoading)}
          </p>
        </div>

        <div
          className="bg-white p-6 rounded-lg shadow"
          data-testid="stat-upcoming-events"
        >
          <h3 className="text-lg font-semibold text-gray-900">
            Upcoming Events
          </h3>
          <p
            className="text-3xl font-bold text-purple-600 mt-2"
            data-testid="stat-upcoming-events-value"
          >
            {formatCount(upcomingEventsCount, eventsLoading)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Members
          </h3>
          {recentMembers.length > 0 ? (
            <div className="space-y-3">
              {recentMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      <a href={`/members/${member.id}`}>
                        {member.preferred_name || member.first_name}{' '}
                        {member.last_name}
                      </a>
                    </p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">
              No members yet. Start by adding some!
            </p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Upcoming Events
          </h3>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className="border-l-4 border-purple-200 pl-3"
                >
                  <a href={`/events/${event.id}`}>
                    <p className="font-medium text-gray-900">{event.name}</p>
                  </a>
                  <p className="text-sm text-gray-500">
                    {new Date(event.start_datetime).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No events scheduled.</p>
          )}
        </div>
      </div>
    </div>
  );
}
