import { EventMarketing } from '@/types';

interface MarketingProps {
  marketing?: EventMarketing;
  onEditMarketing: () => void;
}

export function Marketing({ marketing, onEditMarketing }: MarketingProps) {
  if (!marketing) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          No marketing content yet
        </h3>
        <button
          onClick={onEditMarketing}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Add Marketing Content
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Marketing Content</h3>
        <button
          onClick={onEditMarketing}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Edit Marketing
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Primary Copy</h4>
          <p className="text-gray-700 text-sm">
            {marketing.primary_marketing_copy || 'Not set'}
          </p>
        </div>
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Blurb</h4>
          <p className="text-gray-700 text-sm">
            {marketing.blurb || 'Not set'}
          </p>
        </div>
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Social Media Copy</h4>
          <p className="text-gray-700 text-sm">
            {marketing.social_media_copy || 'Not set'}
          </p>
        </div>
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Email Subject</h4>
          <p className="text-gray-700 text-sm">
            {marketing.email_subject || 'Not set'}
          </p>
        </div>
      </div>
    </div>
  );
}
