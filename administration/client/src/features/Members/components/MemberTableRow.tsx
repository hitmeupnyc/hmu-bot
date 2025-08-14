import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

import { Member } from '@/types';
import { MemberStatusBadge } from './MemberStatusBadge';

interface MemberTableRowProps {
  member: Member;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
  isEditPending: boolean;
  isDeletePending: boolean;
}

export function MemberTableRow({
  member,
  onEdit,
  onDelete,
  isEditPending,
  isDeletePending,
}: MemberTableRowProps) {
  const getDisplayName = () => {
    return member.preferred_name
      ? `${member.preferred_name} (${member.first_name}) ${member.last_name}`
      : `${member.first_name} ${member.last_name}`;
  };

  const handleDelete = () => {
    if (
      !confirm(
        `Are you sure you want to delete ${member.first_name} ${member.last_name}?`
      )
    ) {
      return;
    }
    onDelete(member);
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <Link
          to={`/members/${member.id}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-900"
        >
          {getDisplayName()}
        </Link>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{member.email}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{member.pronouns || '-'}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <MemberStatusBadge flags={member.flags} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(member)}
            disabled={isEditPending}
            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeletePending}
            className="text-red-600 hover:text-red-900 disabled:opacity-50"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
