import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PencilIcon, TrashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useMember, useUpdateMember, useDeleteMember } from '../hooks/useMembers';
import { MemberFormData } from '../types';
import { Modal } from '../components/Modal';
import { MemberForm } from '../components/MemberForm';

export function MemberDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const memberId = parseInt(id || '0', 10);
  const { data: member, isLoading, error } = useMember(memberId, !!id);
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();

  const handleUpdateMember = async (formData: MemberFormData) => {
    try {
      await updateMember.mutateAsync({
        id: memberId,
        ...formData,
      });
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Failed to update member:', error);
      alert('Failed to update member. Please try again.');
    }
  };

  const handleDeleteMember = async () => {
    if (!member) return;
    
    if (!confirm(`Are you sure you want to delete ${member.first_name} ${member.last_name}?`)) {
      return;
    }

    try {
      await deleteMember.mutateAsync(memberId);
      navigate('/members');
    } catch (error) {
      console.error('Failed to delete member:', error);
      alert('Failed to delete member. Please try again.');
    }
  };

  const getDisplayName = (member: any) => {
    return member.preferred_name 
      ? `${member.preferred_name} (${member.first_name}) ${member.last_name}`
      : `${member.first_name} ${member.last_name}`;
  };

  const getStatusBadge = (member: any) => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-gray-500">Loading member details...</div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Failed to load member details</div>
        <div className="space-x-4">
          <button 
            onClick={() => navigate('/members')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Members
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/members')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {getDisplayName(member)}
            </h1>
            <p className="text-gray-600">{member.email}</p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setIsEditModalOpen(true)}
            disabled={updateMember.isPending}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit
          </button>
          <button
            onClick={handleDeleteMember}
            disabled={deleteMember.isPending}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      {/* Member Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Full Name</dt>
              <dd className="text-sm text-gray-900">{member.first_name} {member.last_name}</dd>
            </div>
            {member.preferred_name && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Preferred Name</dt>
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
              <dd className="text-sm text-gray-900">{getStatusBadge(member)}</dd>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
          <dl className="space-y-3">
            {member.sponsor_notes && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Sponsor Notes</dt>
                <dd className="text-sm text-gray-900 whitespace-pre-wrap">{member.sponsor_notes}</dd>
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

      {/* Activity History Placeholder */}
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity History</h2>
        <p className="text-gray-500 text-sm">
          Activity history and audit logs will be displayed here in a future update.
        </p>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Member"
      >
        <MemberForm
          member={member}
          onSubmit={handleUpdateMember}
          onCancel={() => setIsEditModalOpen(false)}
          isLoading={updateMember.isPending}
        />
      </Modal>
    </div>
  );
}