import { type Member } from '@/lib/apiClient';

interface StatusBadgeProps {
  member: Member;
}

export function StatusBadge({ member }: StatusBadgeProps) {
  const isActive = member.flags ? member.flags & 1 : false;
  const isProfessional = member.flags ? member.flags & 2 : false;

  // Map access_level to proper names
  return (
    <div className="flex flex-wrap gap-1">
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}
      >
        {isActive ? 'Active' : 'Inactive'}
      </span>
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        {member.flags}
      </span>
      {isProfessional && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          Professional
        </span>
      )}
    </div>
  );
}
