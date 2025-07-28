import { useState } from 'react';
import { ApplicationFormData } from '../types';

interface ApplicationFormProps {
  onSubmit: (data: ApplicationFormData) => void;
  isLoading?: boolean;
}

const REFERRAL_SOURCES = [
  'Fetlife',
  'Google',
  'HMU Instagram',
  'Friend/Word of mouth',
  'Event attendee',
  'Other'
];

export function ApplicationForm({ onSubmit, isLoading = false }: ApplicationFormProps) {
  const [formData, setFormData] = useState<ApplicationFormData>({
    name: '',
    pronouns: '',
    preferred_name: '',
    email: '',
    social_urls: {
      primary: '',
      secondary: '',
      tertiary: ''
    },
    birth_year: new Date().getFullYear() - 25,
    referral_source: '',
    sponsor_name: '',
    sponsor_email_confirmation: false,
    referral_details: '',
    kinky_experience: '',
    self_description: '',
    consent_understanding: '',
    additional_info: '',
    consent_policy_agreement: 'yes'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.birth_year || formData.birth_year < 1900 || formData.birth_year > new Date().getFullYear() - 21) {
      newErrors.birth_year = 'You must be 21 or older to apply';
    }

    if (!formData.referral_source) {
      newErrors.referral_source = 'Please tell us how you heard about us';
    }

    if (!formData.sponsor_name.trim()) {
      newErrors.sponsor_name = 'Sponsor name is required';
    }

    if (!formData.sponsor_email_confirmation) {
      newErrors.sponsor_email_confirmation = 'Please confirm your sponsor can email us';
    }

    if (formData.referral_source === 'Other' && !formData.referral_details.trim()) {
      newErrors.referral_details = 'Please explain how you heard about us';
    }

    if (formData.referral_source === 'Event attendee' && !formData.referral_details.trim()) {
      newErrors.referral_details = 'Please tell us which event you attended';
    }

    if (!formData.kinky_experience.trim()) {
      newErrors.kinky_experience = 'Please describe your experience with kinky/sexy events';
    }

    if (!formData.self_description.trim()) {
      newErrors.self_description = 'Please tell us about yourself';
    }

    if (!formData.consent_understanding.trim()) {
      newErrors.consent_understanding = 'Please describe your understanding of consent';
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('social_urls.')) {
      const urlKey = name.split('.')[1] as keyof typeof formData.social_urls;
      setFormData(prev => ({
        ...prev,
        social_urls: {
          ...prev.social_urls,
          [urlKey]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
                type === 'number' ? parseInt(value) || 0 : value
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">HMU NYC Application</h1>
        <p className="text-gray-600">Please fill out all required fields to apply for membership</p>
      </div>

      {/* Basic Information */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Name * <span className="text-gray-500 text-xs">(First and last, real name please!)</span>
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
            {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="pronouns" className="block text-sm font-medium text-gray-700 mb-2">
              Pronouns
            </label>
            <input
              type="text"
              id="pronouns"
              name="pronouns"
              value={formData.pronouns}
              onChange={handleChange}
              placeholder="e.g., they/them, she/her, he/him"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="preferred_name" className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Name <span className="text-gray-500 text-xs">(We'll keep this on file, you can use it to buy tickets)</span>
            </label>
            <input
              type="text"
              id="preferred_name"
              name="preferred_name"
              value={formData.preferred_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.email 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="birth_year" className="block text-sm font-medium text-gray-700 mb-2">
              Birth Year * <span className="text-gray-500 text-xs">(Our events are 21+)</span>
            </label>
            <input
              type="number"
              id="birth_year"
              name="birth_year"
              required
              min="1900"
              max={new Date().getFullYear() - 21}
              value={formData.birth_year}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.birth_year 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {errors.birth_year && <p className="text-red-600 text-sm mt-1">{errors.birth_year}</p>}
          </div>
        </div>
      </div>

      {/* Social Media */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Social Media URLs (Optional)</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="social_urls.primary" className="block text-sm font-medium text-gray-700 mb-2">
              Primary URL
            </label>
            <input
              type="url"
              id="social_urls.primary"
              name="social_urls.primary"
              value={formData.social_urls.primary}
              onChange={handleChange}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="social_urls.secondary" className="block text-sm font-medium text-gray-700 mb-2">
              Secondary URL
            </label>
            <input
              type="url"
              id="social_urls.secondary"
              name="social_urls.secondary"
              value={formData.social_urls.secondary}
              onChange={handleChange}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="social_urls.tertiary" className="block text-sm font-medium text-gray-700 mb-2">
              Tertiary URL
            </label>
            <input
              type="url"
              id="social_urls.tertiary"
              name="social_urls.tertiary"
              value={formData.social_urls.tertiary}
              onChange={handleChange}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Referral Information */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">How Did You Hear About Us?</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="referral_source" className="block text-sm font-medium text-gray-700 mb-2">
              Referral Source *
            </label>
            <select
              id="referral_source"
              name="referral_source"
              required
              value={formData.referral_source}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.referral_source 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            >
              <option value="">Select how you heard about us</option>
              {REFERRAL_SOURCES.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
            {errors.referral_source && <p className="text-red-600 text-sm mt-1">{errors.referral_source}</p>}
          </div>

          {(formData.referral_source === 'Other' || formData.referral_source === 'Event attendee') && (
            <div>
              <label htmlFor="referral_details" className="block text-sm font-medium text-gray-700 mb-2">
                {formData.referral_source === 'Other' ? 'Please explain how you heard about us *' : 'Which event did you attend? *'}
              </label>
              <textarea
                id="referral_details"
                name="referral_details"
                required
                rows={3}
                value={formData.referral_details}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  errors.referral_details 
                    ? 'border-red-300 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              {errors.referral_details && <p className="text-red-600 text-sm mt-1">{errors.referral_details}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Sponsor Information */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Sponsor Information</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="sponsor_name" className="block text-sm font-medium text-gray-700 mb-2">
              Sponsor Name *
            </label>
            <input
              type="text"
              id="sponsor_name"
              name="sponsor_name"
              required
              value={formData.sponsor_name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.sponsor_name 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {errors.sponsor_name && <p className="text-red-600 text-sm mt-1">{errors.sponsor_name}</p>}
          </div>

          <div>
            <label className="flex items-start">
              <input
                type="checkbox"
                name="sponsor_email_confirmation"
                checked={formData.sponsor_email_confirmation}
                onChange={handleChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
              />
              <span className="ml-2 text-sm text-gray-700">
                Can you ask your sponsor to email us directly? *
              </span>
            </label>
            {errors.sponsor_email_confirmation && <p className="text-red-600 text-sm mt-1">{errors.sponsor_email_confirmation}</p>}
          </div>
        </div>
      </div>

      {/* Experience Questionnaires */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Tell Us About Yourself</h2>
        <div className="space-y-6">
          <div>
            <label htmlFor="kinky_experience" className="block text-sm font-medium text-gray-700 mb-2">
              Describe your experience with kinky/sexy events *
            </label>
            <textarea
              id="kinky_experience"
              name="kinky_experience"
              required
              rows={4}
              value={formData.kinky_experience}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.kinky_experience 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {errors.kinky_experience && <p className="text-red-600 text-sm mt-1">{errors.kinky_experience}</p>}
          </div>

          <div>
            <label htmlFor="self_description" className="block text-sm font-medium text-gray-700 mb-2">
              Tell us about yourself *
            </label>
            <textarea
              id="self_description"
              name="self_description"
              required
              rows={4}
              value={formData.self_description}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.self_description 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {errors.self_description && <p className="text-red-600 text-sm mt-1">{errors.self_description}</p>}
          </div>

          <div>
            <label htmlFor="consent_understanding" className="block text-sm font-medium text-gray-700 mb-2">
              Describe your understanding of consent *
            </label>
            <textarea
              id="consent_understanding"
              name="consent_understanding"
              required
              rows={4}
              value={formData.consent_understanding}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.consent_understanding 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {errors.consent_understanding && <p className="text-red-600 text-sm mt-1">{errors.consent_understanding}</p>}
          </div>

          <div>
            <label htmlFor="additional_info" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Information (Optional)
            </label>
            <textarea
              id="additional_info"
              name="additional_info"
              rows={3}
              value={formData.additional_info}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Consent Policy Agreement */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Consent Policy Agreement</h2>
        <div className="space-y-3">
          <label className="flex items-start">
            <input
              type="radio"
              name="consent_policy_agreement"
              value="yes"
              checked={formData.consent_policy_agreement === 'yes'}
              onChange={handleChange}
              className="border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
            />
            <span className="ml-2 text-sm text-gray-700">Yes! I agree to the consent policy</span>
          </label>
          <label className="flex items-start">
            <input
              type="radio"
              name="consent_policy_agreement"
              value="questions"
              checked={formData.consent_policy_agreement === 'questions'}
              onChange={handleChange}
              className="border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
            />
            <span className="ml-2 text-sm text-gray-700">I have questions about the consent policy</span>
          </label>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-center">
        <button
          type="submit"
          disabled={isLoading}
          className="px-8 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-lg"
        >
          {isLoading ? 'Submitting Application...' : 'Submit Application'}
        </button>
      </div>
    </form>
  );
}