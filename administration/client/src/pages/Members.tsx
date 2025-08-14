import { DocumentArrowUpIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

import {
  MemberFormModal,
  MemberGrid,
  MemberPagination,
} from '@/features/Members/components';
import { CsvImport } from '@/features/Members/components/CsvImport';
import { useMemberCrud } from '@/features/Members/hooks/useMemberCrud';
import { useMemberCsvImport } from '@/features/Members/hooks/useMemberCsvImport';
import { useMembers } from '@/hooks/useMembers';

export function Members() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [showCsvImport, setShowCsvImport] = useState(false);

  const { data, isLoading, error } = useMembers({
    page: currentPage,
    limit: 20,
    search: searchTerm || undefined,
  });

  const {
    isModalOpen,
    editingMember,
    handleCreateMember,
    handleEditMember,
    handleDeleteMember,
    handleFormSubmit,
    closeModal,
    isCreatePending,
    isUpdatePending,
    isDeletePending,
    isFormLoading,
  } = useMemberCrud();

  const { handleCsvImport, isCsvImportLoading } = useMemberCsvImport();

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
            onClick={() => setShowCsvImport(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-700"
          >
            <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
            Import CSV
          </button>
          <button
            onClick={handleCreateMember}
            disabled={isCreatePending}
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
          isEditPending={isUpdatePending}
          isDeletePending={isDeletePending}
        >
          {pagination && (
            <MemberPagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
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
        isLoading={isFormLoading}
      />

      {showCsvImport && (
        <CsvImport
          onImport={async (applications) => {
            await handleCsvImport(applications);
            setShowCsvImport(false);
          }}
          onClose={() => setShowCsvImport(false)}
          isLoading={isCsvImportLoading}
        />
      )}
    </div>
  );
}
