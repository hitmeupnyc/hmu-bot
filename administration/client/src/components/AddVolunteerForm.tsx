import React, { useState } from 'react';
import { CreateVolunteerRequest, Member } from '../types';

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
  'photographer',
];

export const AddVolunteerForm = ({
  members,
  onAddVolunteer,
  isLoading,
  onCancel,
}: {
  members: Member[];
  onAddVolunteer: (data: CreateVolunteerRequest) => Promise<void>;
  isLoading?: boolean;
  onCancel: () => void;
}) => {
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
    volunteer_notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.member_id || !formData.role) return;

    await onAddVolunteer(formData);
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
      volunteer_notes: '',
    });
  };

  const handleChange = (field: keyof CreateVolunteerRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="pb-6">
      <h3 className="text-lg font-medium mb-4">Add New Volunteer</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Member *
            </label>
            <select
              value={formData.member_id}
              onChange={(e) =>
                handleChange('member_id', parseInt(e.target.value))
              }
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
                  {role
                    .replace('_', ' ')
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
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
            onChange={(e) =>
              handleChange('special_instructions', e.target.value)
            }
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
            onClick={onCancel}
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
  );
};
