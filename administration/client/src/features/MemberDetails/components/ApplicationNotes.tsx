import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../../lib/api';

interface ApplicationNotesProps {
  memberId: number;
  onNoteAdded: () => void;
}

export function ApplicationNotes({
  memberId,
  onNoteAdded,
}: ApplicationNotesProps) {
  const [noteContent, setNoteContent] = useState('');

  const addNoteMutation = useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      const response = await api.post(`/audit`, {
        entity_type: 'member',
        entity_id: memberId,
        action: 'note',
        metadata: {
          content,
        },
      });
      return response.data;
    },
    onSuccess: () => {
      onNoteAdded();
      setNoteContent('');
    },
  });

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

  return (
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
            data-testid="member-note-textarea"
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
  );
}
