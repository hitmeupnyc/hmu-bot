import { useState } from 'react';
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Modal } from '../components/Modal';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export function Settings() {
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([
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
  ]);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    body: ''
  });

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      body: template.body
    });
    setIsTemplateModalOpen(true);
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      subject: '',
      body: ''
    });
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = () => {
    if (!templateForm.name.trim() || !templateForm.subject.trim() || !templateForm.body.trim()) {
      alert('Please fill in all fields');
      return;
    }

    if (editingTemplate) {
      // Update existing template
      setEmailTemplates(templates => 
        templates.map(t => 
          t.id === editingTemplate.id 
            ? { ...editingTemplate, ...templateForm }
            : t
        )
      );
    } else {
      // Create new template
      const newTemplate: EmailTemplate = {
        id: Date.now().toString(),
        ...templateForm
      };
      setEmailTemplates(templates => [...templates, newTemplate]);
    }

    setIsTemplateModalOpen(false);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      setEmailTemplates(templates => templates.filter(t => t.id !== templateId));
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>
      
      <div className="space-y-6">
        {/* Email Templates Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Email Templates</h2>
            <button
              onClick={handleCreateTemplate}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Template
            </button>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {emailTemplates.map((template) => (
                <div key={template.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-600">Subject: {template.subject}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded p-3 mt-2">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-3">
                      {template.body.length > 150 ? template.body.substring(0, 150) + '...' : template.body}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Integration Settings</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Eventbrite</h3>
              <p className="text-sm text-gray-500 mb-2">Connect your Eventbrite account to sync events and attendees</p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Configure Eventbrite
              </button>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Patreon</h3>
              <p className="text-sm text-gray-500 mb-2">Sync patron information and membership levels</p>
              <button className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700">
                Configure Patreon
              </button>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Klaviyo</h3>
              <p className="text-sm text-gray-500 mb-2">Manage email marketing and contact lists</p>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                Configure Klaviyo
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
          </div>
          <div className="p-6">
            <p className="text-gray-500">General settings will be available in a future update.</p>
          </div>
        </div>
      </div>

      {/* Template Edit/Create Modal */}
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title={editingTemplate ? 'Edit Email Template' : 'Create Email Template'}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="templateName" className="block text-sm font-medium text-gray-700 mb-2">
              Template Name
            </label>
            <input
              type="text"
              id="templateName"
              value={templateForm.name}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Welcome Email"
            />
          </div>

          <div>
            <label htmlFor="templateSubject" className="block text-sm font-medium text-gray-700 mb-2">
              Email Subject
            </label>
            <input
              type="text"
              id="templateSubject"
              value={templateForm.subject}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Welcome to Our Community!"
            />
          </div>

          <div>
            <label htmlFor="templateBody" className="block text-sm font-medium text-gray-700 mb-2">
              Email Body
            </label>
            <textarea
              id="templateBody"
              rows={8}
              value={templateForm.body}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, body: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Email body content... You can use {{first_name}}, {{last_name}}, {{email}}, {{preferred_name}} as placeholders."
            />
          </div>

          <div className="bg-blue-50 p-3 rounded-md">
            <h4 className="font-medium text-blue-900 mb-1">Available Variables:</h4>
            <p className="text-sm text-blue-700">
              You can use these placeholders in your templates: <code>{'{{first_name}}'}</code>, <code>{'{{last_name}}'}</code>, <code>{'{{preferred_name}}'}</code>, <code>{'{{email}}'}</code>
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setIsTemplateModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTemplate}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}