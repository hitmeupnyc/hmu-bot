/**
 * Events Management Types and Enums
 * Domain-specific types for the events management system
 */

// Eventbrite Events Status Bitfield
export const EventbriteEventStatus = {
  DRAFT: 1,
  LIVE: 2,
  ENDED: 4,
  CANCELED: 8,
} as const;

export type EventbriteEventStatusType = typeof EventbriteEventStatus[keyof typeof EventbriteEventStatus];

// Eventbrite Events Flags Bitfield
export const EventbriteEventFlags = {
  ACTIVE: 1,
  SYNC_ERROR: 2,
  SYNC_PAUSED: 4,
  IS_FREE: 8,
  IS_ONLINE_EVENT: 16,
  IS_RESERVED_SEATING: 32,
} as const;

export type EventbriteEventFlagsType = typeof EventbriteEventFlags[keyof typeof EventbriteEventFlags];

// Events Marketing Flags Bitfield
export const EventsMarketingFlags = {
  ACTIVE: 1,
  APPROVED: 2,
} as const;

export type EventsMarketingFlagsType = typeof EventsMarketingFlags[keyof typeof EventsMarketingFlags];

// Events Volunteers Flags Bitfield
export const EventsVolunteersFlags = {
  ACTIVE: 1,
  CONFIRMED: 2,
  LEAD_VOLUNTEER: 4,
} as const;

export type EventsVolunteersFlagsType = typeof EventsVolunteersFlags[keyof typeof EventsVolunteersFlags];

// Volunteer Roles
export const VolunteerRole = {
  COORDINATOR: 'coordinator',
  SETUP: 'setup',
  GREETER: 'greeter',
  TECH: 'tech',
  CLEANUP: 'cleanup',
  REGISTRATION: 'registration',
  SECURITY: 'security',
  CATERING: 'catering',
  AV_SUPPORT: 'av_support',
  PHOTOGRAPHER: 'photographer',
} as const;

export type VolunteerRoleType = typeof VolunteerRole[keyof typeof VolunteerRole];

// Events Attendance Source Bitfield
export const EventsAttendanceSource = {
  MANUAL: 1,
  EVENTBRITE: 2,
  DOOR_SCAN: 4,
  QR_CODE: 8,
  NFC: 16,
  FACIAL_RECOGNITION: 32,
} as const;

export type EventsAttendanceSourceType = typeof EventsAttendanceSource[keyof typeof EventsAttendanceSource];

// Events Attendance Flags Bitfield
export const EventsAttendanceFlags = {
  ACTIVE: 1,
  ATTENDED: 2,
  NO_SHOW: 4,
  REFUNDED: 8,
  VIP: 16,
  FIRST_TIME_ATTENDEE: 32,
} as const;

export type EventsAttendanceFlagsType = typeof EventsAttendanceFlags[keyof typeof EventsAttendanceFlags];

// Check-in Methods
export const CheckInMethod = {
  MANUAL: 'manual',
  QR_SCAN: 'qr_scan',
  NFC: 'nfc',
  FACIAL_RECOGNITION: 'facial_recognition',
  BADGE_SCAN: 'badge_scan',
} as const;

export type CheckInMethodType = typeof CheckInMethod[keyof typeof CheckInMethod];

// Sync Direction Types
export const SyncDirection = {
  FROM_EVENTBRITE: 'from_eventbrite',
  TO_EVENTBRITE: 'to_eventbrite',
  BIDIRECTIONAL: 'bidirectional',
} as const;

export type SyncDirectionType = typeof SyncDirection[keyof typeof SyncDirection];

// Sync Status Types
export const SyncStatus = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  ERROR: 'error',
} as const;

export type SyncStatusType = typeof SyncStatus[keyof typeof SyncStatus];

// Events Eventbrite Link Flags Bitfield
export const EventsEventbriteLinkFlags = {
  ACTIVE: 1,
  SYNC_ERROR: 2,
  SYNC_PAUSED: 4,
} as const;

export type EventsEventbriteLinkFlagsType = typeof EventsEventbriteLinkFlags[keyof typeof EventsEventbriteLinkFlags];

// Helper interfaces for complex JSON fields
export interface EventbriteVenue {
  id: string;
  name: string;
  address?: {
    address_1?: string;
    address_2?: string;
    city?: string;
    region?: string;
    postal_code?: string;
    country?: string;
    latitude?: string;
    longitude?: string;
  };
  capacity?: number;
}

export interface EventbriteOrganizer {
  id: string;
  name: string;
  description?: {
    text?: string;
    html?: string;
  };
  url?: string;
  logo?: {
    url?: string;
  };
}

export interface EventbriteTicketClass {
  id: string;
  name: string;
  description?: string;
  cost?: {
    currency: string;
    value: number;
    display: string;
  };
  fee?: {
    currency: string;
    value: number;
    display: string;
  };
  tax?: {
    currency: string;
    value: number;
    display: string;
  };
  quantity_total?: number;
  quantity_sold?: number;
  on_sale_status?: string;
  sales_start?: string;
  sales_end?: string;
  minimum_quantity?: number;
  maximum_quantity?: number;
}

export interface MarketingImage {
  url: string;
  alt_text?: string;
  caption?: string;
  type: 'hero' | 'thumbnail' | 'social' | 'email';
  dimensions?: {
    width: number;
    height: number;
  };
}

export interface VolunteerEquipment {
  name: string;
  description?: string;
  quantity?: number;
  provided_by?: 'organization' | 'volunteer';
}

export interface VolunteerSkill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  required: boolean;
}

// Comprehensive event data with all related information
export interface EventWithDetails {
  event: import('./database').Events;
  eventbrite_event?: import('./database').EventbriteEvents;
  marketing?: import('./database').EventsMarketing;
  volunteers: import('./database').EventsVolunteers[];
  attendance: import('./database').EventsAttendance[];
  eventbrite_link?: import('./database').EventsEventbriteLink;
}

// Event creation/update payloads
export interface CreateEventPayload {
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

export interface CreateEventMarketingPayload {
  event_id: number;
  primary_marketing_copy?: string;
  secondary_marketing_copy?: string;
  blurb?: string;
  social_media_copy?: string;
  email_subject?: string;
  email_preview_text?: string;
  seo_title?: string;
  seo_description?: string;
  hashtags?: string[];
  marketing_images?: MarketingImage[];
  key_selling_points?: string[];
}

export interface CreateVolunteerPayload {
  event_id: number;
  member_id: number;
  role: VolunteerRoleType;
  contact_phone?: string;
  contact_email?: string;
  arrival_time?: string;
  departure_time?: string;
  special_instructions?: string;
  equipment_needed?: VolunteerEquipment[];
  skills_required?: VolunteerSkill[];
  volunteer_notes?: string;
}

export interface CreateAttendancePayload {
  event_id: number;
  member_id?: number;
  eventbrite_attendee_id?: string;
  eventbrite_order_id?: string;
  ticket_type?: string;
  registration_date?: string;
  attendance_source?: EventsAttendanceSourceType;
  check_in_method?: CheckInMethodType;
  marketing_source?: string;
  notes?: string;
}

// Utility functions for bitfield operations
export class BitfieldHelper {
  static hasFlag(value: number, flag: number): boolean {
    return (value & flag) === flag;
  }

  static addFlag(value: number, flag: number): number {
    return value | flag;
  }

  static removeFlag(value: number, flag: number): number {
    return value & ~flag;
  }

  static toggleFlag(value: number, flag: number): number {
    return value ^ flag;
  }
}