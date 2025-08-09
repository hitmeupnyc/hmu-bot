import React, { useState } from 'react';
import { CreateEventMarketingRequest } from '../types';

interface EventMarketingFormProps {
  eventId: number;
  initialData?: Partial<CreateEventMarketingRequest>;
  onSubmit: (data: CreateEventMarketingRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const EventMarketingForm: React.FC<EventMarketingFormProps> = ({
  eventId: _eventId,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<CreateEventMarketingRequest>({
    primary_marketing_copy: initialData?.primary_marketing_copy || '',
    secondary_marketing_copy: initialData?.secondary_marketing_copy || '',
    blurb: initialData?.blurb || '',
    social_media_copy: initialData?.social_media_copy || '',
    email_subject: initialData?.email_subject || '',
    email_preview_text: initialData?.email_preview_text || '',
    seo_title: initialData?.seo_title || '',
    seo_description: initialData?.seo_description || '',
    hashtags: initialData?.hashtags || [],
    marketing_images: initialData?.marketing_images || [],
    key_selling_points: initialData?.key_selling_points || [],
  });

  const [hashtag, setHashtag] = useState('');
  const [sellingPoint, setSellingPoint] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleChange = (field: keyof CreateEventMarketingRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addHashtag = () => {
    if (hashtag.trim() && !formData.hashtags?.includes(hashtag.trim())) {
      handleChange('hashtags', [...(formData.hashtags || []), hashtag.trim()]);
      setHashtag('');
    }
  };

  const removeHashtag = (index: number) => {
    const newHashtags = [...(formData.hashtags || [])];
    newHashtags.splice(index, 1);
    handleChange('hashtags', newHashtags);
  };

  const addSellingPoint = () => {
    if (sellingPoint.trim() && !formData.key_selling_points?.includes(sellingPoint.trim())) {
      handleChange('key_selling_points', [
        ...(formData.key_selling_points || []),
        sellingPoint.trim(),
      ]);
      setSellingPoint('');
    }
  };

  const removeSellingPoint = (index: number) => {
    const newPoints = [...(formData.key_selling_points || [])];
    newPoints.splice(index, 1);
    handleChange('key_selling_points', newPoints);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-6">Event Marketing Content</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Primary Marketing Copy */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Primary Marketing Copy
            <textarea
              value={formData.primary_marketing_copy}
              onChange={(e) => handleChange('primary_marketing_copy', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Main marketing message for the event"
            />
          </label>
        </div>

        {/* Secondary Marketing Copy */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Secondary Marketing Copy
            <textarea
              value={formData.secondary_marketing_copy}
              onChange={(e) => handleChange('secondary_marketing_copy', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Supporting marketing content"
            />
          </label>
        </div>

        {/* Blurb */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Blurb
            <input
              type="text"
              value={formData.blurb}
              onChange={(e) => handleChange('blurb', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Short description/tagline"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Social Media Copy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Social Media Copy
              <textarea
                value={formData.social_media_copy}
                onChange={(e) => handleChange('social_media_copy', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optimized for social sharing"
              />
            </label>
          </div>

          {/* Email Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Subject
              <input
                type="text"
                value={formData.email_subject}
                onChange={(e) => handleChange('email_subject', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Email campaign subject line"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Email Preview Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Preview Text
              <input
                type="text"
                value={formData.email_preview_text}
                onChange={(e) => handleChange('email_preview_text', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Email preview/preheader text"
              />
            </label>
          </div>

          {/* SEO Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SEO Title
              <input
                type="text"
                value={formData.seo_title}
                onChange={(e) => handleChange('seo_title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="SEO optimized title"
              />
            </label>
          </div>
        </div>

        {/* SEO Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            SEO Description
            <textarea
              value={formData.seo_description}
              onChange={(e) => handleChange('seo_description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Meta description for SEO"
            />
          </label>
        </div>

        {/* Hashtags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hashtags
            <input
              type="text"
              value={hashtag}
              onChange={(e) => setHashtag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add hashtag"
            />
          </label>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={addHashtag}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.hashtags?.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => removeHashtag(index)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Key Selling Points */}
        <div>
          <div className="flex gap-2 mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Key Selling Points
              <input
                type="text"
                value={sellingPoint}
                onChange={(e) => setSellingPoint(e.target.value)}
                onKeyUp={(e) => e.key === 'Enter' && (e.preventDefault(), addSellingPoint())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add selling point"
              />
            </label>
            <button
              type="button"
              onClick={addSellingPoint}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Add
            </button>
          </div>
          <div className="space-y-2">
            {formData.key_selling_points?.map((point, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
              >
                <span className="text-sm">{point}</span>
                <button
                  type="button"
                  onClick={() => removeSellingPoint(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Marketing Content'}
          </button>
        </div>
      </form>
    </div>
  );
};
