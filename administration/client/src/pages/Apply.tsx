import { useState } from 'react';
import { ApplicationForm } from '@/components/ApplicationForm';
import { MemberCreateBody } from '@/lib/apiClient';
import { useCreateMember } from '@/hooks/useMembers';

// Application form data structure (what the form uses)
interface ApplicationFormData {
  name: string;
  pronouns: string;
  preferred_name: string;
  email: string;
  social_urls: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  birth_year: number;
  referral_source: string;
  sponsor_name: string;
  sponsor_email_confirmation: boolean;
  referral_details: string;
  kinky_experience: string;
  self_description: string;
  consent_understanding: string;
  additional_info: string;
  consent_policy_agreement: string;
}

// Transform application form data to API format
function transformToMemberCreateBody(formData: ApplicationFormData): MemberCreateBody {
  const [firstName, ...lastNameParts] = formData.name.trim().split(' ');
  const lastName = lastNameParts.join(' ') || '';

  // Create sponsor notes from all the application details
  const sponsorNotes = [
    `Birth Year: ${formData.birth_year}`,
    `Referral Source: ${formData.referral_source}`,
    formData.referral_details && `Referral Details: ${formData.referral_details}`,
    `Sponsor: ${formData.sponsor_name}`,
    `Sponsor Email Confirmation: ${formData.sponsor_email_confirmation ? 'Yes' : 'No'}`,
    `Kinky Experience: ${formData.kinky_experience}`,
    `Self Description: ${formData.self_description}`,
    `Consent Understanding: ${formData.consent_understanding}`,
    formData.additional_info && `Additional Info: ${formData.additional_info}`,
    `Consent Policy Agreement: ${formData.consent_policy_agreement}`,
    Object.values(formData.social_urls).filter(Boolean).length > 0 &&
      `Social URLs: ${Object.values(formData.social_urls).filter(Boolean).join(', ')}`
  ].filter(Boolean).join('\n\n');

  return {
    first_name: firstName,
    last_name: lastName,
    preferred_name: formData.preferred_name || undefined,
    email: formData.email,
    pronouns: formData.pronouns || undefined,
    sponsor_notes: sponsorNotes || undefined
  };
}

export function Apply() {
  const [submitted, setSubmitted] = useState(false);
  const createMemberMutation = useCreateMember();

  const handleSubmit = async (data: ApplicationFormData) => {
    try {
      const memberData = transformToMemberCreateBody(data);
      await createMemberMutation.mutateAsync(memberData);
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Failed to submit application. Please try again.');
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Application Submitted!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Thank you for your application. We'll review it and get back to you soon.
            </p>
          </div>
          <div className="mt-4">
            <span className="text-green-600 text-sm">Application submitted</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <ApplicationForm onSubmit={handleSubmit} isLoading={createMemberMutation.isPending} />
    </div>
  );
}