import { Member } from '../../../types';
import { StatusBadge } from './StatusBadge';

interface InfoCardsProps {
  member: Member;
}

export function InfoCards({ member }: InfoCardsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Basic Information */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Basic Information
        </h2>
        <dl className="space-y-3">
          <div>
            <dt className="text-sm font-medium text-gray-500">Full Name</dt>
            <dd className="text-sm text-gray-900">
              {member.first_name} {member.last_name}
            </dd>
          </div>
          {member.preferred_name && (
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Preferred Name
              </dt>
              <dd className="text-sm text-gray-900">{member.preferred_name}</dd>
            </div>
          )}
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="text-sm text-gray-900">{member.email}</dd>
          </div>
          {member.pronouns && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Pronouns</dt>
              <dd className="text-sm text-gray-900">{member.pronouns}</dd>
            </div>
          )}
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="text-sm text-gray-900">
              <StatusBadge member={member} />
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Member Since</dt>
            <dd className="text-sm text-gray-900">
              {new Date(member.created_at).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </div>

      {/* Additional Information */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Additional Information
        </h2>
        <dl className="space-y-3">
          {member.sponsor_notes && (
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Sponsor Notes
              </dt>
              <dd className="text-sm text-gray-900 whitespace-pre-wrap">
                {member.sponsor_notes}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
            <dd className="text-sm text-gray-900">
              {new Date(member.updated_at).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
