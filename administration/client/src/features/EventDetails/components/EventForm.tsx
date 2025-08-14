import { Event, EventFormData } from '@/types';
import { useState } from 'react';

interface EventFormProps {
  event?: Event;
  onSubmit: (data: EventFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function EventForm({
  event,
  onSubmit,
  onCancel,
  isLoading = false,
}: EventFormProps) {
  const [formData, setFormData] = useState<EventFormData>({
    name: event?.name || '',
    description: event?.description || '',
    start_datetime: event?.start_datetime
      ? formatDateTimeLocal(event.start_datetime)
      : '',
    end_datetime: event?.end_datetime
      ? formatDateTimeLocal(event.end_datetime)
      : '',
    is_public: event ? !!(event.flags & 2) : true,
    max_capacity: event?.max_capacity?.toString() || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Event name is required';
    }

    if (!formData.start_datetime) {
      newErrors.start_datetime = 'Start date and time is required';
    }

    if (!formData.end_datetime) {
      newErrors.end_datetime = 'End date and time is required';
    }

    if (formData.start_datetime && formData.end_datetime) {
      const start = new Date(formData.start_datetime);
      const end = new Date(formData.end_datetime);

      if (end <= start) {
        newErrors.end_datetime = 'End time must be after start time';
      }
    }

    if (formData.max_capacity && parseInt(formData.max_capacity) < 1) {
      newErrors.max_capacity = 'Capacity must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Event Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          value={formData.name}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
            errors.name
              ? 'border-red-300 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500'
          }`}
        />
        {errors.name && (
          <p className="text-red-600 text-sm mt-1">{errors.name}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          value={formData.description}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="start_datetime"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Start Date & Time *
          </label>
          <input
            type="datetime-local"
            id="start_datetime"
            name="start_datetime"
            required
            value={formData.start_datetime}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.start_datetime
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {errors.start_datetime && (
            <p className="text-red-600 text-sm mt-1">{errors.start_datetime}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="end_datetime"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            End Date & Time *
          </label>
          <input
            type="datetime-local"
            id="end_datetime"
            name="end_datetime"
            required
            value={formData.end_datetime}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.end_datetime
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {errors.end_datetime && (
            <p className="text-red-600 text-sm mt-1">{errors.end_datetime}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="max_capacity"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Max Capacity
          </label>
          <input
            type="number"
            id="max_capacity"
            name="max_capacity"
            min="1"
            value={formData.max_capacity}
            onChange={handleChange}
            placeholder="Leave empty for unlimited"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.max_capacity
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {errors.max_capacity && (
            <p className="text-red-600 text-sm mt-1">{errors.max_capacity}</p>
          )}
        </div>

        <div className="flex items-end">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="is_public"
              checked={formData.is_public}
              onChange={handleChange}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Public Event</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
        </button>
      </div>
    </form>
  );
}

// Utility function to format datetime for input[type="datetime-local"]
function formatDateTimeLocal(dateString: string): string {
  const date = new Date(dateString);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}
