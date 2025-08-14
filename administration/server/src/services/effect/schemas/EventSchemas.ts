import { Schema } from 'effect';

export const EventSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  description: Schema.Union(Schema.String, Schema.Null, Schema.Undefined),
  start_datetime: Schema.String,
  end_datetime: Schema.String,
  flags: Schema.Number,
  max_capacity: Schema.Union(Schema.Number, Schema.Null, Schema.Undefined),
  eventbrite_id: Schema.Union(Schema.String, Schema.Null, Schema.Undefined),
  eventbrite_url: Schema.Union(Schema.String, Schema.Null, Schema.Undefined),
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
  eventbrite_id: Schema.optional(Schema.String),
  eventbrite_url: Schema.optional(Schema.String),
});

export type CreateEvent = typeof CreateEventSchema.Type;

export const UpdateEventSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  start_datetime: Schema.optional(Schema.String),
  end_datetime: Schema.optional(Schema.String),
  flags: Schema.optional(Schema.Number),
  max_capacity: Schema.optional(Schema.Number),
  eventbrite_id: Schema.optional(Schema.String),
  eventbrite_url: Schema.optional(Schema.String),
});

export type UpdateEvent = typeof UpdateEventSchema.Type;

export const EventQueryOptionsSchema = Schema.Struct({
  page: Schema.Number,
  limit: Schema.Number,
  upcoming: Schema.optionalWith(Schema.Boolean, { default: () => false }),
});

export type EventQueryOptions = typeof EventQueryOptionsSchema.Type;

export const EventMarketingSchema = Schema.Struct({
  id: Schema.Number,
  event_id: Schema.Number,
  primary_marketing_copy: Schema.Union(
    Schema.String,
    Schema.Null,
    Schema.Undefined
  ),
  secondary_marketing_copy: Schema.Union(
    Schema.String,
    Schema.Null,
    Schema.Undefined
  ),
  blurb: Schema.Union(Schema.String, Schema.Null, Schema.Undefined),
  social_media_copy: Schema.Union(Schema.String, Schema.Null, Schema.Undefined),
  email_subject: Schema.Union(Schema.String, Schema.Null, Schema.Undefined),
  email_preview_text: Schema.Union(
    Schema.String,
    Schema.Null,
    Schema.Undefined
  ),
  seo_title: Schema.Union(Schema.String, Schema.Null, Schema.Undefined),
  seo_description: Schema.Union(Schema.String, Schema.Null, Schema.Undefined),
  hashtags: Schema.Union(Schema.String, Schema.Null, Schema.Undefined),
  marketing_images_json: Schema.Union(
    Schema.String,
    Schema.Null,
    Schema.Undefined
  ),
  key_selling_points: Schema.Union(
    Schema.String,
    Schema.Null,
    Schema.Undefined
  ),
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
  contact_phone: Schema.Union(Schema.String, Schema.Null, Schema.Undefined),
  contact_email: Schema.Union(Schema.String, Schema.Null, Schema.Undefined),
  arrival_time: Schema.Union(Schema.String, Schema.Null, Schema.Undefined),
  departure_time: Schema.Union(Schema.String, Schema.Null, Schema.Undefined),
  special_instructions: Schema.Union(
    Schema.String,
    Schema.Null,
    Schema.Undefined
  ),
  equipment_needed: Schema.Union(Schema.String, Schema.Null, Schema.Undefined),
  skills_required: Schema.Union(Schema.String, Schema.Null, Schema.Undefined),
  volunteer_notes: Schema.Union(Schema.String, Schema.Null, Schema.Undefined),
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

export const EventWithDetailsSchema = Schema.Struct({
  event: EventSchema,
  eventbrite_event: Schema.optional(Schema.String),
  marketing: Schema.optional(EventMarketingSchema),
  volunteers: Schema.Array(EventVolunteerSchema),
  eventbrite_link: Schema.optional(Schema.String),
});

export type EventWithDetails = typeof EventWithDetailsSchema.Type;
