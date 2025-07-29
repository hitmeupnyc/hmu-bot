import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { PencilIcon, TrashIcon, ArrowLeftIcon, ClockIcon, ChatBubbleLeftIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { useMember, useUpdateMember, useDeleteMember } from '../hooks/useMembers';
import { useMemberAuditLog } from '../hooks/useAudit';
import { MemberFormData } from '../types';
import { Modal } from '../components/Modal';
import { MemberForm } from '../components/MemberForm';
import { api } from '../lib/api';
import { getAccessLevelName, getAccessLevelColor } from '../utils/authorization';

export function MemberDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const memberId = parseInt(id || '0', 10);
  const { data: member, isLoading, error } = useMember(memberId, !!id);
  const { data: auditLog, isLoading: auditLoading, refetch: refetchAuditLog } = useMemberAuditLog(memberId, !!id);
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();

  const emailTemplates = [
    {
      id: 'welcome',
      name: 'Welcome Email',
      subject: 'Welcome to Our Community!',
      body: 'Hi {{first_name}},\n\nWelcome to our community! We\'re excited to have you join us.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\nBest regards,\nThe Team'
    },
    {
      id: 'reminder',
      name: 'Event Reminder',
      subject: 'Upcoming Event Reminder',
      body: 'Hello {{preferred_name || first_name}},\n\nThis is a friendly reminder about our upcoming event.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.\n\nSee you there!\nEvent Team'
    },
    {
      id: 'follow_up',
      name: 'Follow-up',
      subject: 'Following up with you',
      body: 'Dear {{first_name}},\n\nI wanted to follow up on our recent conversation.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.\n\nPlease let me know if you have any questions.\n\nBest,\nAdmin Team'
    }
  ];

  const addNoteMutation = useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      const response = await api.post(`/members/${memberId}/notes`, { content, tags: [] });
      return response.data;
    },
    onSuccess: () => {
      // Refetch audit log to show the new note
      refetchAuditLog();
      // Reset form
      setNoteContent('');
    },
  });

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

  const handleSendEmail = async () => {
    const template = emailTemplates.find(t => t.id === selectedTemplate);
    if (!template || !member) return;

    // In a real implementation, this would call an API to send the email
    // For now, we'll just show an alert
    alert(`Email "${template.name}" would be sent to ${member.email}\n\nSubject: ${template.subject}\n\nThis is a placeholder implementation.`);
    setIsEmailModalOpen(false);
    setSelectedTemplate('');
  };

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!noteContent.trim()) {
      return;
    }

    try {
      await addNoteMutation.mutateAsync({ content: noteContent.trim() });
    } catch (error) {
      console.error('Failed to add note:', error);
      alert('Failed to add note. Please try again.');
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
      <div className="flex flex-wrap gap-1">
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
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          getAccessLevelColor(member.access_level || 1)
        }`}>
          {getAccessLevelName(member.access_level || 1)}
        </span>
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

      {/* Notes Section */}
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
          <ChatBubbleLeftIcon className="h-5 w-5 mr-2" />
          Notes
        </h2>
        
        <form onSubmit={handleSubmitNote} className="mb-4">
          <div className="flex gap-3">
            <textarea
              id="noteContent"
              rows={2}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Add a note about this member..."
              disabled={addNoteMutation.isPending}
            />
            <button
              type="submit"
              disabled={!noteContent.trim() || addNoteMutation.isPending}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap self-start"
            >
              {addNoteMutation.isPending ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </form>
      </div>

      {/* Activity History */}
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ClockIcon className="h-5 w-5 mr-2" />
          Activity History
        </h2>
        
        {auditLoading ? (
          <div className="text-gray-500 text-sm">Loading activity history...</div>
        ) : !auditLog || auditLog.length === 0 ? (
          <div className="text-gray-500 text-sm">No activity recorded yet.</div>
        ) : (
          <div className="space-y-4">
            {auditLog.filter(entry => entry.action !== 'view').map((entry) => (
              <div key={entry.id} className="border-l-4 border-blue-200 pl-4 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      entry.action === 'create' ? 'bg-green-100 text-green-800' :
                      entry.action === 'update' ? 'bg-yellow-100 text-yellow-800' :
                      entry.action === 'delete' ? 'bg-red-100 text-red-800' :
                      entry.action === 'view' ? 'bg-blue-100 text-blue-800' :
                      entry.action === 'note' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}
                    </span>
                    <span className="text-sm text-gray-600">
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    Session: {entry.user_session_id.slice(0, 8)}... | IP: {entry.user_ip}
                  </span>
                </div>
                
                {entry.action === 'update' && entry.oldValues && entry.newValues && (
                  <div className="mt-2 text-sm">
                    <div className="text-gray-600 mb-1">Changes made:</div>
                    <div className="bg-gray-50 rounded p-2 space-y-1">
                      {Object.keys(entry.newValues).map((key) => {
                        const oldValue = entry.oldValues?.[key];
                        const newValue = entry.newValues?.[key];
                        
                        if (oldValue !== newValue && key !== 'id' && key !== 'updated_at') {
                          return (
                            <div key={key} className="text-xs">
                              <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                              <span className="text-red-600 line-through ml-1">{String(oldValue || '(empty)')}</span>
                              <span className="mx-1">→</span>
                              <span className="text-green-600">{String(newValue || '(empty)')}</span>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}
                
                {entry.action === 'create' && entry.newValues && (
                  <div className="mt-2 text-sm">
                    <div className="text-gray-600">Member created with initial data</div>
                  </div>
                )}
                
                {entry.action === 'note' && entry.metadata && (
                  <div className="mt-2 text-sm">
                    <div className="bg-purple-50 rounded p-3 border-l-2 border-purple-200">
                      <div className="text-gray-800 whitespace-pre-wrap">{entry.metadata.content}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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

      {/* Email Modal */}
      <Modal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        title="Send Email"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-3">
              Send email to: <span className="font-medium">{member?.email}</span>
            </p>
            <label htmlFor="emailTemplate" className="block text-sm font-medium text-gray-700 mb-2">
              Choose Template
            </label>
            <select
              id="emailTemplate"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a template...</option>
              {emailTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {selectedTemplate && (
            <div className="bg-gray-50 p-3 rounded-md">
              <h4 className="font-medium text-gray-900 mb-2">Preview:</h4>
              <div className="text-sm space-y-1">
                <p><strong>Subject:</strong> {emailTemplates.find(t => t.id === selectedTemplate)?.subject}</p>
                <div>
                  <strong>Body:</strong>
                  <pre className="mt-1 text-xs text-gray-600 whitespace-pre-wrap">
                    {emailTemplates.find(t => t.id === selectedTemplate)?.body}
                  </pre>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setIsEmailModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSendEmail}
              disabled={!selectedTemplate}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Email
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}