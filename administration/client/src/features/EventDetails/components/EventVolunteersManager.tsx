import { CreateVolunteerRequest, EventVolunteer, Member } from '@/types';
import React, { useState } from 'react';
import { AddVolunteerForm } from './AddVolunteerForm';

interface EventVolunteersManagerProps {
  eventId: number;
  volunteers: EventVolunteer[];
  members: Member[];
  onAddVolunteer: (data: CreateVolunteerRequest) => Promise<void>;
  isLoading?: boolean;
}

const getMemberName = (members: Member[], memberId: number) => {
  const member = members.find((m) => m.id === memberId);
  return member ? `${member.first_name} ${member.last_name}` : 'Unknown Member';
};

export const EventVolunteersManager: React.FC<EventVolunteersManagerProps> = ({
  eventId: _eventId,
  volunteers,
  members,
  onAddVolunteer,
  isLoading = false,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);

  const getVolunteerStatusIcon = (volunteer: EventVolunteer) => {
    if (volunteer.checked_in_at) {
      return <span className="text-green-500">✓ Checked In</span>;
    }
    if (volunteer.confirmed_at) {
      return <span className="text-blue-500">⚠ Confirmed</span>;
    }
    return <span className="text-yellow-500">⏳ Pending</span>;
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'Not set';
    return new Date(timeString).toLocaleString();
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Event Volunteers</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        >
          Add Volunteer
        </button>
      </div>

      {/* Add Volunteer Form */}
      {showAddForm && (
        <AddVolunteerForm
          members={members}
          onAddVolunteer={async (data) => {
            await onAddVolunteer(data);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
          isLoading={isLoading}
        />
      )}

      {/* Volunteers List */}
      <div className="space-y-4 mb-6">
        {volunteers.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No volunteers assigned to this event.
          </p>
        ) : (
          volunteers.map((volunteer) => (
            <div
              key={volunteer.id}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium text-lg">
                    {getMemberName(members, volunteer.member_id)}
                  </h3>
                  <p className="text-gray-600 capitalize">
                    Role: {volunteer.role.replace('_', ' ')}
                  </p>
                </div>
                <div className="text-right">
                  {getVolunteerStatusIcon(volunteer)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                {volunteer.contact_phone && (
                  <div>
                    <span className="font-medium">Phone:</span>{' '}
                    {volunteer.contact_phone}
                  </div>
                )}
                {volunteer.contact_email && (
                  <div>
                    <span className="font-medium">Email:</span>{' '}
                    {volunteer.contact_email}
                  </div>
                )}
                {volunteer.arrival_time && (
                  <div>
                    <span className="font-medium">Arrival:</span>{' '}
                    {formatTime(volunteer.arrival_time)}
                  </div>
                )}
                {volunteer.departure_time && (
                  <div>
                    <span className="font-medium">Departure:</span>{' '}
                    {formatTime(volunteer.departure_time)}
                  </div>
                )}
              </div>

              {volunteer.special_instructions && (
                <div className="mt-3 p-2 bg-yellow-50 rounded">
                  <span className="font-medium text-yellow-800">
                    Special Instructions:
                  </span>
                  <p className="text-yellow-700 text-sm mt-1">
                    {volunteer.special_instructions}
                  </p>
                </div>
              )}

              {volunteer.volunteer_notes && (
                <div className="mt-3 p-2 bg-blue-50 rounded">
                  <span className="font-medium text-blue-800">
                    Volunteer Notes:
                  </span>
                  <p className="text-blue-700 text-sm mt-1">
                    {volunteer.volunteer_notes}
                  </p>
                </div>
              )}

              {volunteer.hours_worked && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">Hours Worked:</span>{' '}
                  {volunteer.hours_worked}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
};
