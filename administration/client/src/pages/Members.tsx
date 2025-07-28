import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Member, MemberFormData } from '../types';
import { Modal } from '../components/Modal';
import { MemberForm } from '../components/MemberForm';
import { 
  useMembers, 
  useCreateMember, 
  useUpdateMember, 
  useDeleteMember,
  usePrefetchMember 
} from '../hooks/useMembers';

export function Members() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // React Query hooks
  const { data, isLoading, error } = useMembers({ 
    page: currentPage, 
    limit: 20, 
    search: searchTerm || undefined 
  });
  
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();
  const prefetchMember = usePrefetchMember();

  const members = data?.members || [];
  const pagination = data?.pagination;

  const handleCreateMember = () => {
    setEditingMember(null);
    setIsModalOpen(true);
  };

  const handleEditMember = (member: Member) => {
    setEditingMember(member);
    setIsModalOpen(true);
  };

  const handleDeleteMember = async (member: Member) => {
    if (!confirm(`Are you sure you want to delete ${member.first_name} ${member.last_name}?`)) {
      return;
    }

    try {
      await deleteMember.mutateAsync(member.id);
    } catch (error) {
      console.error('Failed to delete member:', error);
      alert('Failed to delete member. Please try again.');
    }
  };

  const handleFormSubmit = async (formData: MemberFormData) => {
    try {
      if (editingMember) {
        await updateMember.mutateAsync({
          id: editingMember.id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          preferred_name: formData.preferred_name || '',
          email: formData.email,
          pronouns: formData.pronouns || '',
          sponsor_notes: formData.sponsor_notes || '',
          is_professional_affiliate: formData.is_professional_affiliate
        });
      } else {
        await createMember.mutateAsync({
          first_name: formData.first_name,
          last_name: formData.last_name,
          preferred_name: formData.preferred_name || '',
          email: formData.email,
          pronouns: formData.pronouns || '',
          sponsor_notes: formData.sponsor_notes || '',
          is_professional_affiliate: formData.is_professional_affiliate
        });
      }
      
      setIsModalOpen(false);
      setEditingMember(null);
    } catch (error) {
      console.error('Failed to save member:', error);
      alert('Failed to save member. Please try again.');
    }
  };

  const getDisplayName = (member: Member) => {
    return member.preferred_name 
      ? `${member.preferred_name} (${member.first_name}) ${member.last_name}`
      : `${member.first_name} ${member.last_name}`;
  };

  const getStatusBadge = (member: Member) => {
    const isActive = member.flags & 1;
    const isProfessional = member.flags & 2;
    
    return (
      <div className="flex space-x-1">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
        {isProfessional && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Professional
          </span>
        )}
      </div>
    );
  };

  // Show error state
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Failed to load members</div>
        <button 
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Members</h1>
        <button 
          onClick={handleCreateMember}
          disabled={createMember.isPending}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 disabled:opacity-50"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Member
        </button>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                  <tr 
                    key={member.id} 
                    className="hover:bg-gray-50"
                    onMouseEnter={() => prefetchMember(member.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link 
                        to={`/members/${member.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-900"
                      >
                        {getDisplayName(member)}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{member.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{member.pronouns || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(member)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditMember(member)}
                          disabled={updateMember.isPending}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMember(member)}
                          disabled={deleteMember.isPending}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isLoading}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={currentPage === pagination.totalPages || isLoading}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingMember(null);
        }}
        title={editingMember ? 'Edit Member' : 'Add New Member'}
      >
        <MemberForm
          member={editingMember || undefined}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingMember(null);
          }}
          isLoading={createMember.isPending || updateMember.isPending}
        />
      </Modal>
    </div>
  );
}