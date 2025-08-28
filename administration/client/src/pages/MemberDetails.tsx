import {
  ArrowLeftIcon,
  ClockIcon,
  EnvelopeIcon,
  PencilIcon,
  TrashIcon,
  InformationCircleIcon,
  ChatBubbleLeftIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Modal } from '@/components/Modal';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';
import {
  ApplicationNotes,
  AuditHistory,
  EditMemberForm,
  EmailModal,
  InfoCards,
  LoadingStates,
  MemberFlags,
} from '@/features/MemberDetails/components';
import { FlagGrantModal } from '@/features/Permissions/components';
import { useFlags } from '@/hooks/useFlags';
import { useAuditLog } from '@/hooks/useAudit';
import {
  useDeleteMember,
  useMember,
  useUpdateMember,
} from '@/hooks/useMembers';
import { MemberFormData } from '@/types';

type TabType = 'info' | 'notes' | 'flags' | 'audit';

export function MemberDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('info');

  const memberId = parseInt(id || '0', 10);
  const { data: member, isLoading, error } = useMember(memberId, !!id);
  const {
    data: auditLog,
    isLoading: auditLoading,
    refetch: refetchAuditLog,
  } = useAuditLog('member', memberId, !!id);
  const { data: flags = [] } = useFlags();
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

    if (
      !confirm(
        `Are you sure you want to delete ${member.first_name} ${member.last_name}?`
      )
    ) {
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

  const handleSendEmail = async (subject: string, body: string) => {
    if (!member || !subject.trim() || !body.trim()) {
      alert('Please fill in both subject and body fields.');
      return;
    }

    // In a real implementation, this would call an API to send the email
    // For now, we'll just show an alert
    alert(
      `Email would be sent to ${member.email}\n\nSubject: ${subject}\n\nBody: ${body.substring(0, 100)}...\n\nThis is a placeholder implementation.`
    );
    setIsEmailModalOpen(false);
  };

  const handleNoteAdded = () => {
    refetchAuditLog();
  };

  const handleGrantFlag = () => {
    setShowGrantModal(true);
  };

  const handleCloseGrantModal = () => {
    setShowGrantModal(false);
  };

  const tabs = [
    {
      id: 'info' as TabType,
      label: 'Member Info',
      icon: InformationCircleIcon,
      count: null
    },
    {
      id: 'notes' as TabType,
      label: 'Notes',
      icon: ChatBubbleLeftIcon,
      count: null
    },
    {
      id: 'flags' as TabType,
      label: 'Flags & Permissions',
      icon: ShieldCheckIcon,
      count: null
    },
    {
      id: 'audit' as TabType,
      label: 'Audit History',
      icon: ClockIcon,
      count: null
    }
  ];

  // Handle loading and error states
  if (isLoading || error || !member) {
    return <LoadingStates isLoading={isLoading} error={error} />;
  }

  const displayName = `${member.first_name} ${member.preferred_name ? `(${member.preferred_name}) ` : ''}${member.last_name}`;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/members')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            data-testid="back-to-members-btn"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1
              className="text-3xl font-bold text-gray-900"
              data-testid="member-name-heading"
            >
              {displayName}
            </h1>
            <p className="text-gray-600">{member.email}</p>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setIsEmailModalOpen(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <EnvelopeIcon className="h-4 w-4 mr-2" />
            Send Email
          </button>
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

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span className={`ml-2 py-1 px-2 text-xs rounded-full ${
                      activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'info' && (
          <InfoCards member={member} />
        )}

        {activeTab === 'notes' && (
          <ApplicationNotes memberId={memberId} onNoteAdded={handleNoteAdded} />
        )}

        {activeTab === 'flags' && (
          <div className="bg-white shadow rounded-lg p-6">
            <FeatureErrorBoundary featureName="Member Flags & Permissions">
              <MemberFlags memberEmail={member.email} onGrantFlag={handleGrantFlag} />
            </FeatureErrorBoundary>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ClockIcon className="h-5 w-5 mr-2" />
              Audit History
            </h2>
            <FeatureErrorBoundary featureName="Audit History">
              {auditLoading ? (
                <div className="text-gray-500 text-sm">Loading audit history...</div>
              ) : (
                <AuditHistory auditLog={auditLog} />
              )}
            </FeatureErrorBoundary>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Member"
      >
        <EditMemberForm
          member={member}
          onSubmit={handleUpdateMember}
          onCancel={() => setIsEditModalOpen(false)}
          isLoading={updateMember.isPending}
        />
      </Modal>

      <EmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        member={member}
        onSendEmail={handleSendEmail}
      />

      {/* Grant Flag Modal */}
      <FlagGrantModal
        isOpen={showGrantModal}
        onClose={handleCloseGrantModal}
        flags={flags}
        preselectedEmail={member.email}
      />
    </div>
  );
}
