import React, { useState } from 'react';
import { EventVolunteer, CreateVolunteerRequest, Member } from '../types';

interface EventVolunteersManagerProps {
  eventId: number;
  volunteers: EventVolunteer[];
  members: Member[];
  onAddVolunteer: (data: CreateVolunteerRequest) => Promise<void>;
  isLoading?: boolean;
}

const VOLUNTEER_ROLES = [
  'coordinator',
  'setup',
  'greeter', 
  'tech',
  'cleanup',
  'registration',
  'security',
  'catering',
  'av_support',
  'photographer'
];

export const EventVolunteersManager: React.FC<EventVolunteersManagerProps> = ({
  eventId,
  volunteers,
  members,
  onAddVolunteer,
  isLoading = false
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<CreateVolunteerRequest>({
    member_id: 0,
    role: '',
    contact_phone: '',
    contact_email: '',
    arrival_time: '',
    departure_time: '',
    special_instructions: '',
    equipment_needed: [],
    skills_required: [],
    volunteer_notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.member_id || !formData.role) return;
    
    await onAddVolunteer(formData);
    setShowAddForm(false);
    setFormData({
      member_id: 0,
      role: '',
      contact_phone: '',
      contact_email: '',
      arrival_time: '',
      departure_time: '',
      special_instructions: '',
      equipment_needed: [],
      skills_required: [],
      volunteer_notes: ''
    });
  };

  const handleChange = (field: keyof CreateVolunteerRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getMemberName = (memberId: number) => {
    const member = members.find(m => m.id === memberId);
    return member ? `${member.first_name} ${member.last_name}` : 'Unknown Member';
  };

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
    <div className="bg-white shadow rounded-lg p-6">
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

      {/* Volunteers List */}
      <div className="space-y-4 mb-6">
        {volunteers.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No volunteers assigned to this event.</p>
        ) : (
          volunteers.map((volunteer) => (
            <div key={volunteer.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium text-lg">
                    {getMemberName(volunteer.member_id)}
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
                    <span className="font-medium">Phone:</span> {volunteer.contact_phone}
                  </div>
                )}
                {volunteer.contact_email && (
                  <div>
                    <span className="font-medium">Email:</span> {volunteer.contact_email}
                  </div>
                )}
                {volunteer.arrival_time && (
                  <div>
                    <span className="font-medium">Arrival:</span> {formatTime(volunteer.arrival_time)}
                  </div>
                )}
                {volunteer.departure_time && (
                  <div>
                    <span className="font-medium">Departure:</span> {formatTime(volunteer.departure_time)}
                  </div>
                )}
              </div>

              {volunteer.special_instructions && (
                <div className="mt-3 p-2 bg-yellow-50 rounded">
                  <span className="font-medium text-yellow-800">Special Instructions:</span>
                  <p className="text-yellow-700 text-sm mt-1">{volunteer.special_instructions}</p>
                </div>
              )}

              {volunteer.volunteer_notes && (
                <div className="mt-3 p-2 bg-blue-50 rounded">
                  <span className="font-medium text-blue-800">Volunteer Notes:</span>
                  <p className="text-blue-700 text-sm mt-1">{volunteer.volunteer_notes}</p>
                </div>
              )}

              {volunteer.hours_worked && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">Hours Worked:</span> {volunteer.hours_worked}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Volunteer Form */}
      {showAddForm && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Add New Volunteer</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Member *
                </label>
                <select
                  value={formData.member_id}
                  onChange={(e) => handleChange('member_id', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value={0}>Select a member</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a role</option>
                  {VOLUNTEER_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => handleChange('contact_phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Arrival Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.arrival_time}
                  onChange={(e) => handleChange('arrival_time', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departure Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.departure_time}
                  onChange={(e) => handleChange('departure_time', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Special Instructions
              </label>
              <textarea
                value={formData.special_instructions}
                onChange={(e) => handleChange('special_instructions', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Any special instructions for this volunteer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Volunteer Notes
              </label>
              <textarea
                value={formData.volunteer_notes}
                onChange={(e) => handleChange('volunteer_notes', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Notes from the volunteer"
              />
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !formData.member_id || !formData.role}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? 'Adding...' : 'Add Volunteer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};