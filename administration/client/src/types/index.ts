// Core entity types
export interface Member {
  id: number;
  first_name: string;
  last_name: string;
  preferred_name?: string;
  email: string;
  pronouns?: string;
  sponsor_notes?: string;
  date_added: string;
  flags: number;
  access_level: number;
  created_at: string;
  updated_at: string;
}

export interface MembershipType {
  id: number;
  name: string;
  description?: string;
  price_cents?: number;
  flags: number;
  exclusive_group_id?: string;
  benefits_json?: string;
  created_at: string;
}

export interface MemberMembership {
  id: number;
  member_id: number;
  membership_type_id: number;
  start_date: string;
  end_date?: string;
  payment_status_id?: number;
  external_payment_reference?: string;
  notes?: string;
  created_at: string;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Request/Response DTOs
export interface CreateMemberRequest {
  first_name: string;
  last_name: string;
  preferred_name?: string;
  email: string;
  pronouns?: string;
  sponsor_notes?: string;
  is_professional_affiliate?: boolean;
}

export interface UpdateMemberRequest extends Partial<CreateMemberRequest> {
  id: number;
}

// Utility types
export type MemberFlags = {
  active: boolean;
  professional_affiliate: boolean;
};

// Event types
export interface Event {
  id: number;
  name: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  flags: number;
  eventbrite_id?: string;
  eventbrite_url?: string;
  max_capacity?: number;
  required_membership_types?: string;
  created_by_member_id?: number;
  created_at: string;
  updated_at: string;
}

export interface EventAttendance {
  id: number;
  event_id: number;
  member_id: number;
  checked_in_at?: string;
  checked_out_at?: string;
  attendance_source: string;
  notes?: string;
}

export interface CreateEventRequest {
  name: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  is_public?: boolean;
  max_capacity?: number;
  required_membership_types?: number[];
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {
  id: number;
}

// Form types
export interface MemberFormData {
  first_name: string;
  last_name: string;
  preferred_name: string;
  email: string;
  pronouns: string;
  sponsor_notes: string;
  is_professional_affiliate: boolean;
}

export interface ApplicationFormData {
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
  consent_policy_agreement: 'yes' | 'questions';
}

export interface EventFormData {
  name: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  is_public: boolean;
  max_capacity: string;
}