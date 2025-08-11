import { z } from 'zod';

// Common validation patterns
const emailSchema = z.string().email('Invalid email format');
const positiveIntSchema = z.number().int().positive('Must be a positive integer');
const nonEmptyStringSchema = z.string().min(1, 'Field cannot be empty');
const optionalNonEmptyStringSchema = z.string().min(1).optional().or(z.literal(''));
const dateStringSchema = z.string().refine(
  (date) => !isNaN(Date.parse(date)),
  'Invalid date format'
);

// Member schemas
export const createMemberSchema = z.object({
  first_name: nonEmptyStringSchema.max(100, 'First name too long'),
  last_name: nonEmptyStringSchema.max(100, 'Last name too long'),
  preferred_name: optionalNonEmptyStringSchema,
  email: emailSchema.max(255, 'Email too long'),
  pronouns: z.string().max(50, 'Pronouns too long').optional(),
  sponsor_notes: z.string().max(1000, 'Sponsor notes too long').optional(),
  is_professional_affiliate: z.boolean().optional().default(false)
});

export const updateMemberSchema = createMemberSchema.partial().extend({
  id: positiveIntSchema
});

export const memberQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional()
});

// Event schemas
export const createEventSchema = z.object({
  name: nonEmptyStringSchema.max(200, 'Event name too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  start_datetime: dateStringSchema,
  end_datetime: dateStringSchema,
  is_public: z.boolean().optional().default(true),
  max_capacity: z.number().int().min(1).optional(),
  required_membership_types: z.array(positiveIntSchema).optional()
}).refine(
  (data) => new Date(data.start_datetime) < new Date(data.end_datetime),
  {
    message: 'End date must be after start date',
    path: ['end_datetime']
  }
);

export const updateEventSchema = createEventSchema.partial().extend({
  id: positiveIntSchema
});

// Application form schema
export const applicationFormSchema = z.object({
  name: nonEmptyStringSchema.max(200, 'Name too long'),
  pronouns: nonEmptyStringSchema.max(50, 'Pronouns too long'),
  preferred_name: nonEmptyStringSchema.max(100, 'Preferred name too long'),
  email: emailSchema.max(255, 'Email too long'),
  social_urls: z.object({
    primary: z.string().url('Invalid URL format').or(z.literal('')).optional(),
    secondary: z.string().url('Invalid URL format').or(z.literal('')).optional(),
    tertiary: z.string().url('Invalid URL format').or(z.literal('')).optional()
  }),
  birth_year: z.number().int().min(1900).max(new Date().getFullYear() - 13, 'Must be at least 13 years old'),
  referral_source: nonEmptyStringSchema.max(200, 'Referral source too long'),
  sponsor_name: nonEmptyStringSchema.max(200, 'Sponsor name too long'),
  sponsor_email_confirmation: z.boolean(),
  referral_details: z.string().max(1000, 'Referral details too long'),
  kinky_experience: z.string().max(2000, 'Experience description too long'),
  self_description: z.string().max(2000, 'Self description too long'),
  consent_understanding: z.string().max(2000, 'Consent understanding too long'),
  additional_info: z.string().max(2000, 'Additional info too long'),
  consent_policy_agreement: z.enum(['yes', 'questions'])
});

// ID parameter schema
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('Invalid ID')
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

// Webhook schemas
export const webhookPayloadSchema = z.object({
  event_type: nonEmptyStringSchema,
  platform: z.enum(['eventbrite', 'patreon', 'klaviyo', 'discord']),
  data: z.record(z.string(), z.any()),
  timestamp: dateStringSchema.optional()
});

// Audit log schemas
export const auditQuerySchema = z.object({
  entity_type: z.enum(['member', 'event', 'audit_log']).default('member'),
  entity_id: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  page: z.coerce.number().int().min(1).default(1),
  action: z.enum(['create', 'update', 'delete', 'view', 'search']).optional(),
  start_date: dateStringSchema.optional(),
  end_date: dateStringSchema.optional()
}).refine(
  (data) => {
    if (data.start_date && data.end_date) {
      return new Date(data.start_date) <= new Date(data.end_date);
    }
    return true;
  },
  {
    message: 'End date must be after or equal to start date',
    path: ['end_date']
  }
);

// Export type inference helpers
export type CreateMemberRequest = z.infer<typeof createMemberSchema>;
export type UpdateMemberRequest = z.infer<typeof updateMemberSchema>;
export type CreateEventRequest = z.infer<typeof createEventSchema>;
export type UpdateEventRequest = z.infer<typeof updateEventSchema>;
export type ApplicationFormData = z.infer<typeof applicationFormSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
export type AuditQuery = z.infer<typeof auditQuerySchema>;
export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;