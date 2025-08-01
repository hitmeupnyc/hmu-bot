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

// Enhanced Events Management Types
export interface EventbriteEvent {
  id: number;
  eventbrite_id: string;
  name_text?: string;
  name_html?: string;
  description_text?: string;
  description_html?: string;
  url?: string;
  start_utc?: string;
  end_utc?: string;
  start_timezone?: string;
  end_timezone?: string;
  start_local?: string;
  end_local?: string;
  capacity?: number;
  status: number;
  category_id?: string;
  subcategory_id?: string;
  format_id?: string;
  show_remaining: number;
  venue_json?: string;
  organizer_json?: string;
  ticket_classes_json?: string;
  raw_eventbrite_data?: string;
  last_synced_at: string;
  sync_hash?: string;
  flags: number;
  created_at: string;
  updated_at: string;
}

export interface EventMarketing {
  id: number;
  event_id: number;
  primary_marketing_copy?: string;
  secondary_marketing_copy?: string;
  blurb?: string;
  social_media_copy?: string;
  email_subject?: string;
  email_preview_text?: string;
  seo_title?: string;
  seo_description?: string;
  hashtags?: string;
  marketing_images_json?: string;
  key_selling_points?: string;
  created_by_member_id?: number;
  flags: number;
  created_at: string;
  updated_at: string;
}

export interface EventVolunteer {
  id: number;
  event_id: number;
  member_id: number;
  role: string;
  contact_phone?: string;
  contact_email?: string;
  arrival_time?: string;
  departure_time?: string;
  special_instructions?: string;
  equipment_needed?: string;
  skills_required?: string;
  volunteer_notes?: string;
  coordinator_notes?: string;
  confirmed_at?: string;
  checked_in_at?: string;
  checked_out_at?: string;
  hours_worked?: number;
  flags: number;
  created_at: string;
  updated_at: string;
}

export interface EventAttendance {
  id: number;
  event_id: number;
  member_id?: number;
  eventbrite_attendee_id?: string;
  eventbrite_order_id?: string;
  ticket_type?: string;
  registration_date?: string;
  attendance_source: number;
  check_in_method?: string;
  marketing_source?: string;
  notes?: string;
  flags: number;
  created_at: string;
  updated_at: string;
}

export interface EventWithDetails {
  event: Event;
  eventbrite_event?: EventbriteEvent;
  marketing?: EventMarketing;
  volunteers: EventVolunteer[];
  attendance: EventAttendance[];
  eventbrite_link?: {
    id: number;
    event_id: number;
    eventbrite_event_id: number;
    sync_direction: string;
    last_synced_at?: string;
    sync_status: string;
    sync_errors?: string;
    flags: number;
    created_at: string;
  };
}

// Request types
export interface CreateEventRequest {
  name: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  max_capacity?: number;
  required_membership_types?: number[];
  eventbrite_id?: string;
  eventbrite_url?: string;
  flags?: number;
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {
  id: number;
}

export interface CreateEventMarketingRequest {
  primary_marketing_copy?: string;
  secondary_marketing_copy?: string;
  blurb?: string;
  social_media_copy?: string;
  email_subject?: string;
  email_preview_text?: string;
  seo_title?: string;
  seo_description?: string;
  hashtags?: string[];
  marketing_images?: Array<{
    url: string;
    alt_text?: string;
    caption?: string;
    type: 'hero' | 'thumbnail' | 'social' | 'email';
  }>;
  key_selling_points?: string[];
}

export interface CreateVolunteerRequest {
  member_id: number;
  role: string;
  contact_phone?: string;
  contact_email?: string;
  arrival_time?: string;
  departure_time?: string;
  special_instructions?: string;
  equipment_needed?: Array<{
    name: string;
    description?: string;
    quantity?: number;
    provided_by?: 'organization' | 'volunteer';
  }>;
  skills_required?: Array<{
    name: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    required: boolean;
  }>;
  volunteer_notes?: string;
}

export interface CreateAttendanceRequest {
  member_id?: number;
  eventbrite_attendee_id?: string;
  eventbrite_order_id?: string;
  ticket_type?: string;
  registration_date?: string;
  attendance_source?: number;
  check_in_method?: string;
  marketing_source?: string;
  notes?: string;
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