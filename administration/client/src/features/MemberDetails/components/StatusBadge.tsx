import { Member } from '../../../types';
import {
  getAccessLevelColor,
  getAccessLevelName,
} from '../../../utils/authorization';

interface StatusBadgeProps {
  member: Member;
}

export function StatusBadge({ member }: StatusBadgeProps) {
  const isActive = member.flags & 1;
  const isProfessional = member.flags & 2;

  return (
    <div className="flex flex-wrap gap-1">
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}
      >
        {isActive ? 'Active' : 'Inactive'}
      </span>
      {isProfessional && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Professional
        </span>
      )}
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAccessLevelColor(
          member.access_level || 1
        )}`}
      >
        {getAccessLevelName(member.access_level || 1)}
      </span>
    </div>
  );
}
