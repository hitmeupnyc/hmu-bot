interface MemberStatusBadgeProps {
  flags: number;
}

export function MemberStatusBadge({ flags }: MemberStatusBadgeProps) {
  const isActive = flags & 1;
  const isProfessional = flags & 2;

  return (
    <div className="flex space-x-1">
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}
      >
        {isActive ? 'Active' : 'Inactive'}
      </span>
      {isProfessional ? (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Professional
        </span>
      ) : null}
    </div>
  );
}