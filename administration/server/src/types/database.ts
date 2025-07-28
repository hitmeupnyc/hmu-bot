import type { Generated } from 'kysely';

export interface Database {
  members: MembersTable;
  payment_statuses: PaymentStatusesTable;
  membership_types: MembershipTypesTable;
  member_memberships: MemberMembershipsTable;
  events: EventsTable;
  event_attendance: EventAttendanceTable;
  sync_operations: SyncOperationsTable;
  external_integrations: ExternalIntegrationsTable;
  audit_log: AuditLogTable;
}

export interface MembersTable {
  id: Generated<number>;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  email: string;
  pronouns: string | null;
  sponsor_notes: string | null;
  date_added: Generated<string>;
  flags: Generated<number>;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface PaymentStatusesTable {
  id: Generated<number>;
  name: string;
  description: string | null;
  sort_order: Generated<number>;
  flags: Generated<number>;
  created_at: Generated<string>;
}

export interface MembershipTypesTable {
  id: Generated<number>;
  name: string;
  description: string | null;
  price_cents: number | null;
  flags: Generated<number>;
  exclusive_group_id: string | null;
  benefits_json: string | null;
  created_at: Generated<string>;
}

export interface MemberMembershipsTable {
  id: Generated<number>;
  member_id: number;
  membership_type_id: number;
  start_date: string;
  end_date: string | null;
  payment_status_id: number | null;
  external_payment_reference: string | null;
  notes: string | null;
  created_at: Generated<string>;
}

export interface EventsTable {
  id: Generated<number>;
  name: string;
  description: string | null;
  start_datetime: string;
  end_datetime: string;
  flags: Generated<number>;
  eventbrite_id: string | null;
  eventbrite_url: string | null;
  max_capacity: number | null;
  required_membership_types: string | null;
  created_by_member_id: number | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface EventAttendanceTable {
  id: Generated<number>;
  event_id: number;
  member_id: number;
  checked_in_at: string | null;
  checked_out_at: string | null;
  attendance_source: Generated<string>;
  notes: string | null;
}

export interface SyncOperationsTable {
  id: Generated<number>;
  platform: string;
  operation_type: string;
  external_id: string | null;
  member_id: number | null;
  status: string;
  payload_json: string | null;
  error_message: string | null;
  created_at: Generated<string>;
  processed_at: string | null;
}

export interface ExternalIntegrationsTable {
  id: Generated<number>;
  member_id: number;
  system_name: string;
  external_id: string;
  external_data_json: string | null;
  last_synced_at: string | null;
  flags: Generated<number>;
}

export interface AuditLogTable {
  id: Generated<number>;
  entity_type: string;
  entity_id: number | null;
  action: string;
  user_session_id: string | null;
  user_ip: string | null;
  old_values_json: string | null;
  new_values_json: string | null;
  metadata_json: string | null;
  created_at: Generated<string>;
}