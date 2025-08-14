import { Member } from '@/types';
import { MemberTableRow } from './MemberTableRow';

interface MemberGridProps {
  members: Member[];
  isLoading: boolean;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
  isEditPending: boolean;
  isDeletePending: boolean;
  children?: React.ReactNode;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export function MemberGrid({
  members,
  isLoading,
  onEdit,
  onDelete,
  isEditPending,
  isDeletePending,
  children,
  searchTerm,
  onSearchChange,
}: MemberGridProps) {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pronouns
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Loading members...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No members found. Start by adding your first member!
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <MemberTableRow
                  key={member.id}
                  member={member}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  isEditPending={isEditPending}
                  isDeletePending={isDeletePending}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      {children}
    </div>
  );
}
