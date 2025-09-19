import { PlusIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

import {
  MemberFormModal,
  MemberGrid,
  MemberPagination,
} from '@/features/Members/components';
import { useCreateMember, useUpdateMember, useDeleteMember } from '@/hooks/useMembers';
import { useMembers } from '@/hooks/useMembers';

export function Members() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);


  const { data, isLoading, error } = useMembers({
    query: {
      page: currentPage.toString(),
      limit: '20',
      search: searchTerm || undefined,
      sortOrder: 'desc',
    }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();
  
  const handleCreateMember = () => {
    setEditingMember(null);
    setIsModalOpen(true);
  };
  
  const handleEditMember = (member: any) => {
    setEditingMember(member);
    setIsModalOpen(true);
  };
  
  const handleDeleteMember = async (member: any) => {
    if (confirm(`Delete ${member.first_name} ${member.last_name}?`)) {
      try {
        await deleteMember.mutateAsync(member.id);
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };
  
  const handleFormSubmit = async (formData: any) => {
    try {
      if (editingMember) {
        await updateMember.mutateAsync({
          id: editingMember.id,
          ...formData
        });
      } else {
        await createMember.mutateAsync(formData);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Form submit failed:', error);
    }
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMember(null);
  };

  const members = data?.members || [];
  const pagination = data?.pagination;

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
        <div className="flex space-x-3">
          <button
            onClick={handleCreateMember}
            disabled={createMember.isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 disabled:opacity-50"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Member
          </button>
        </div>
      </div>

      <div className="mt-4">
        <MemberGrid
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          members={members}
          isLoading={isLoading}
          onEdit={handleEditMember}
          onDelete={handleDeleteMember}
          isEditPending={updateMember.isPending}
          isDeletePending={deleteMember.isPending}
        >
          {pagination && (
            <MemberPagination
              currentPage={currentPage}
              totalPages={pagination?.totalPages || 1}
              isLoading={isLoading}
              onPageChange={setCurrentPage}
            />
          )}
        </MemberGrid>
      </div>

      <MemberFormModal
        isOpen={isModalOpen}
        editingMember={editingMember}
        onSubmit={handleFormSubmit}
        onClose={closeModal}
        isLoading={editingMember ? updateMember.isPending : createMember.isPending}
      />

    </div>
  );
}
