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