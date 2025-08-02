import { Schema } from 'effect';

export const EventSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  description: Schema.optional(Schema.String),
  start_datetime: Schema.String,
  end_datetime: Schema.String,
  flags: Schema.Number,
  max_capacity: Schema.optional(Schema.Number),
  required_membership_types: Schema.optional(Schema.String),
  eventbrite_id: Schema.optional(Schema.String),
  eventbrite_url: Schema.optional(Schema.String),
  created_at: Schema.String,
  updated_at: Schema.String,
});

export type Event = typeof EventSchema.Type;

export const CreateEventSchema = Schema.Struct({
  name: Schema.String,
  description: Schema.optional(Schema.String),
  start_datetime: Schema.String,
  end_datetime: Schema.String,
  flags: Schema.optionalWith(Schema.Number, { default: () => 3 }), // Default: active + public
  max_capacity: Schema.optional(Schema.Number),
  required_membership_types: Schema.optional(Schema.Array(Schema.Number)),
  eventbrite_id: Schema.optional(Schema.String),
  eventbrite_url: Schema.optional(Schema.String),
});

export type CreateEvent = typeof CreateEventSchema.Type;

export const EventQueryOptionsSchema = Schema.Struct({
  page: Schema.Number,
  limit: Schema.Number,
  upcoming: Schema.optionalWith(Schema.Boolean, { default: () => false }),
});

export type EventQueryOptions = typeof EventQueryOptionsSchema.Type;

export const EventMarketingSchema = Schema.Struct({
  id: Schema.Number,
  event_id: Schema.Number,
  primary_marketing_copy: Schema.optional(Schema.String),
  secondary_marketing_copy: Schema.optional(Schema.String),
  blurb: Schema.optional(Schema.String),
  social_media_copy: Schema.optional(Schema.String),
  email_subject: Schema.optional(Schema.String),
  email_preview_text: Schema.optional(Schema.String),
  seo_title: Schema.optional(Schema.String),
  seo_description: Schema.optional(Schema.String),
  hashtags: Schema.optional(Schema.String),
  marketing_images_json: Schema.optional(Schema.String),
  key_selling_points: Schema.optional(Schema.String),
  flags: Schema.Number,
  created_at: Schema.String,
  updated_at: Schema.String,
});

export type EventMarketing = typeof EventMarketingSchema.Type;

export const CreateEventMarketingSchema = Schema.Struct({
  event_id: Schema.Number,
  primary_marketing_copy: Schema.optional(Schema.String),
  secondary_marketing_copy: Schema.optional(Schema.String),
  blurb: Schema.optional(Schema.String),
  social_media_copy: Schema.optional(Schema.String),
  email_subject: Schema.optional(Schema.String),
  email_preview_text: Schema.optional(Schema.String),
  seo_title: Schema.optional(Schema.String),
  seo_description: Schema.optional(Schema.String),
  hashtags: Schema.optional(Schema.Array(Schema.String)),
  marketing_images: Schema.optional(Schema.Array(Schema.String)),
  key_selling_points: Schema.optional(Schema.Array(Schema.String)),
});

export type CreateEventMarketing = typeof CreateEventMarketingSchema.Type;

export const EventVolunteerSchema = Schema.Struct({
  id: Schema.Number,
  event_id: Schema.Number,
  member_id: Schema.Number,
  role: Schema.String,
  contact_phone: Schema.optional(Schema.String),
  contact_email: Schema.optional(Schema.String),
  arrival_time: Schema.optional(Schema.String),
  departure_time: Schema.optional(Schema.String),
  special_instructions: Schema.optional(Schema.String),
  equipment_needed: Schema.optional(Schema.String),
  skills_required: Schema.optional(Schema.String),
  volunteer_notes: Schema.optional(Schema.String),
  flags: Schema.Number,
  created_at: Schema.String,
  updated_at: Schema.String,
});

export type EventVolunteer = typeof EventVolunteerSchema.Type;

export const CreateVolunteerSchema = Schema.Struct({
  event_id: Schema.Number,
  member_id: Schema.Number,
  role: Schema.String,
  contact_phone: Schema.optional(Schema.String),
  contact_email: Schema.optional(Schema.String),
  arrival_time: Schema.optional(Schema.String),
  departure_time: Schema.optional(Schema.String),
  special_instructions: Schema.optional(Schema.String),
  equipment_needed: Schema.optional(Schema.Array(Schema.String)),
  skills_required: Schema.optional(Schema.Array(Schema.String)),
  volunteer_notes: Schema.optional(Schema.String),
});

export type CreateVolunteer = typeof CreateVolunteerSchema.Type;

export const EventAttendanceSchema = Schema.Struct({
  id: Schema.Number,
  event_id: Schema.Number,
  member_id: Schema.optional(Schema.Number),
  eventbrite_attendee_id: Schema.optional(Schema.String),
  eventbrite_order_id: Schema.optional(Schema.String),
  ticket_type: Schema.optional(Schema.String),
  registration_date: Schema.optional(Schema.String),
  attendance_source: Schema.Number,
  check_in_method: Schema.optional(Schema.String),
  marketing_source: Schema.optional(Schema.String),
  notes: Schema.optional(Schema.String),
  flags: Schema.Number,
  created_at: Schema.String,
  updated_at: Schema.String,
});

export type EventAttendance = typeof EventAttendanceSchema.Type;

export const CreateAttendanceSchema = Schema.Struct({
  event_id: Schema.Number,
  member_id: Schema.optional(Schema.Number),
  eventbrite_attendee_id: Schema.optional(Schema.String),
  eventbrite_order_id: Schema.optional(Schema.String),
  ticket_type: Schema.optional(Schema.String),
  registration_date: Schema.optional(Schema.String),
  attendance_source: Schema.optionalWith(Schema.Number, { default: () => 1 }), // Default to manual
  check_in_method: Schema.optional(Schema.String),
  marketing_source: Schema.optional(Schema.String),
  notes: Schema.optional(Schema.String),
});

export type CreateAttendance = typeof CreateAttendanceSchema.Type;

export const EventWithDetailsSchema = Schema.Struct({
  event: EventSchema,
  eventbrite_event: Schema.optional(Schema.String),
  marketing: Schema.optional(EventMarketingSchema),
  volunteers: Schema.Array(EventVolunteerSchema),
  attendance: Schema.Array(EventAttendanceSchema),
  eventbrite_link: Schema.optional(Schema.String),
});

export type EventWithDetails = typeof EventWithDetailsSchema.Type;
