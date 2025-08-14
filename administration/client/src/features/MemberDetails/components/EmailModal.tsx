import { useState } from 'react';

import { Modal } from '@/components/Modal';
import { Member } from '@/types';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onSendEmail: (subject: string, body: string) => void;
}

const emailTemplates: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    subject: 'Welcome to Our Community!',
    body: "Hi {{first_name}},\n\nWelcome to our community! We're excited to have you join us.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\nBest regards,\nThe Team",
  },
  {
    id: 'reminder',
    name: 'Event Reminder',
    subject: 'Upcoming Event Reminder',
    body: 'Hello {{preferred_name || first_name}},\n\nThis is a friendly reminder about our upcoming event.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.\n\nSee you there!\nEvent Team',
  },
  {
    id: 'follow_up',
    name: 'Follow-up',
    subject: 'Following up with you',
    body: 'Dear {{first_name}},\n\nI wanted to follow up on our recent conversation.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.\n\nPlease let me know if you have any questions.\n\nBest,\nAdmin Team',
  },
];

export function EmailModal({
  isOpen,
  onClose,
  member,
  onSendEmail,
}: EmailModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId) {
      const template = emailTemplates.find((t) => t.id === templateId);
      if (template) {
        setEmailSubject(template.subject);
        setEmailBody(template.body);
      }
    } else {
      setEmailSubject('');
      setEmailBody('');
    }
  };

  const handleSendEmail = () => {
    if (!member || !emailSubject.trim() || !emailBody.trim()) {
      alert('Please fill in both subject and body fields.');
      return;
    }
    onSendEmail(emailSubject, emailBody);
    handleClose();
  };

  const handleClose = () => {
    setSelectedTemplate('');
    setEmailSubject('');
    setEmailBody('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Send Email">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-3">
            Send email to: <span className="font-medium">{member?.email}</span>
          </p>
          <label
            htmlFor="emailTemplate"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Choose Template (Optional)
          </label>
          <select
            id="emailTemplate"
            value={selectedTemplate}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Write your own email...</option>
            {emailTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="emailSubject"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Subject
          </label>
          <input
            type="text"
            id="emailSubject"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter email subject..."
          />
        </div>

        <div>
          <label
            htmlFor="emailBody"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Message
          </label>
          <textarea
            id="emailBody"
            rows={8}
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Write your email message here..."
          />
        </div>

        <div className="bg-blue-50 p-3 rounded-md">
          <h4 className="font-medium text-blue-900 mb-1">
            Available Variables:
          </h4>
          <p className="text-sm text-blue-700">
            You can use these placeholders: <code>{'{{first_name}}'}</code>,{' '}
            <code>{'{{last_name}}'}</code>, <code>{'{{preferred_name}}'}</code>,{' '}
            <code>{'{{email}}'}</code>
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSendEmail}
            disabled={!emailSubject.trim() || !emailBody.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send Email
          </button>
        </div>
      </div>
    </Modal>
  );
}
