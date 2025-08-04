import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Core member information
  await db.schema
    .createTable('members')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('first_name', 'text', (col) => col.notNull())
    .addColumn('last_name', 'text', (col) => col.notNull())
    .addColumn('preferred_name', 'text')
    .addColumn('email', 'text', (col) => col.unique().notNull())
    .addColumn('pronouns', 'text')
    .addColumn('sponsor_notes', 'text')
    .addColumn('date_added', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('flags', 'integer', (col) => col.defaultTo(1)) // Bitfield: 1=active, 2=professional_affiliate
    .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // Payment status lookup table
  await db.schema
    .createTable('payment_statuses')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('name', 'text', (col) => col.unique().notNull())
    .addColumn('description', 'text')
    .addColumn('sort_order', 'integer', (col) => col.defaultTo(0))
    .addColumn('flags', 'integer', (col) => col.defaultTo(1)) // Bitfield: 1=active
    .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // Membership types/tiers
  await db.schema
    .createTable('membership_types')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('price_cents', 'integer') // NULL for free memberships
    .addColumn('flags', 'integer', (col) => col.defaultTo(1)) // Bitfield: 1=active, 2=recurring, 4=exclusive_group
    .addColumn('exclusive_group_id', 'text') // identifier for mutually exclusive groups
    .addColumn('benefits_json', 'text') // JSON array of benefits
    .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // Junction table for member memberships (supports multiple/historical)
  await db.schema
    .createTable('member_memberships')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('member_id', 'integer', (col) => col.notNull().references('members.id'))
    .addColumn('membership_type_id', 'integer', (col) => col.notNull().references('membership_types.id'))
    .addColumn('start_date', 'text', (col) => col.notNull())
    .addColumn('end_date', 'text') // NULL for active memberships
    .addColumn('payment_status_id', 'integer', (col) => col.references('payment_statuses.id'))
    .addColumn('external_payment_reference', 'text') // e.g., Patreon subscription ID
    .addColumn('notes', 'text')
    .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // Events (including Eventbrite integration)
  await db.schema
    .createTable('events')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('start_datetime', 'text', (col) => col.notNull())
    .addColumn('end_datetime', 'text', (col) => col.notNull())
    .addColumn('flags', 'integer', (col) => col.defaultTo(3)) // Bitfield: 1=active, 2=public
    .addColumn('eventbrite_id', 'text') // external integration
    .addColumn('eventbrite_url', 'text')
    .addColumn('max_capacity', 'integer')
    .addColumn('required_membership_types', 'text') // JSON array of membership type IDs
    .addColumn('created_by_member_id', 'integer', (col) => col.references('members.id'))
    .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // Member event attendance
  await db.schema
    .createTable('event_attendance')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('event_id', 'integer', (col) => col.notNull().references('events.id'))
    .addColumn('member_id', 'integer', (col) => col.notNull().references('members.id'))
    .addColumn('checked_in_at', 'text')
    .addColumn('checked_out_at', 'text')
    .addColumn('attendance_source', 'text', (col) => col.defaultTo('manual')) // 'manual', 'eventbrite', 'door_scan', etc.
    .addColumn('notes', 'text')
    .execute();

  // Add unique constraint for event_attendance
  await db.schema
    .createIndex('event_attendance_unique_event_member')
    .on('event_attendance')
    .columns(['event_id', 'member_id'])
    .unique()
    .execute();

  // Sync operation tracking
  await db.schema
    .createTable('sync_operations')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('platform', 'text', (col) => col.notNull()) // 'eventbrite', 'patreon', 'klaviyo'
    .addColumn('operation_type', 'text', (col) => col.notNull()) // 'webhook', 'bulk_sync', 'manual'
    .addColumn('external_id', 'text')
    .addColumn('member_id', 'integer', (col) => col.references('members.id'))
    .addColumn('status', 'text', (col) => col.notNull()) // 'pending', 'success', 'failed', 'conflict'
    .addColumn('payload_json', 'text')
    .addColumn('error_message', 'text')
    .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('processed_at', 'text')
    .execute();

  // External system integrations tracking
  await db.schema
    .createTable('external_integrations')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('member_id', 'integer', (col) => col.notNull().references('members.id'))
    .addColumn('system_name', 'text', (col) => col.notNull()) // 'eventbrite', 'patreon', 'discord', 'kayvio'
    .addColumn('external_id', 'text', (col) => col.notNull())
    .addColumn('external_data_json', 'text') // store relevant external data
    .addColumn('last_synced_at', 'text')
    .addColumn('flags', 'integer', (col) => col.defaultTo(1)) // Bitfield: 1=active
    .execute();

  // Add unique constraint for external_integrations
  await db.schema
    .createIndex('external_integrations_unique_member_system_external')
    .on('external_integrations')
    .columns(['member_id', 'system_name', 'external_id'])
    .unique()
    .execute();

  // Create indexes for performance
  await db.schema.createIndex('idx_members_email').on('members').column('email').execute();
  await db.schema.createIndex('idx_members_active').on('members').column('flags').execute();
  await db.schema.createIndex('idx_member_memberships_active').on('member_memberships').columns(['member_id', 'end_date']).execute();
  await db.schema.createIndex('idx_events_datetime').on('events').columns(['start_datetime', 'end_datetime']).execute();
  await db.schema.createIndex('idx_event_attendance_member').on('event_attendance').column('member_id').execute();
  await db.schema.createIndex('idx_external_integrations_lookup').on('external_integrations').columns(['member_id', 'system_name']).execute();
  await db.schema.createIndex('idx_member_memberships_payment_status').on('member_memberships').column('payment_status_id').execute();
  await db.schema.createIndex('idx_sync_operations_status').on('sync_operations').columns(['platform', 'status']).execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop indexes first
  await db.schema.dropIndex('idx_sync_operations_status').execute();
  await db.schema.dropIndex('idx_member_memberships_payment_status').execute();
  await db.schema.dropIndex('idx_external_integrations_lookup').execute();
  await db.schema.dropIndex('idx_event_attendance_member').execute();
  await db.schema.dropIndex('idx_events_datetime').execute();
  await db.schema.dropIndex('idx_member_memberships_active').execute();
  await db.schema.dropIndex('idx_members_active').execute();
  await db.schema.dropIndex('idx_members_email').execute();
  await db.schema.dropIndex('external_integrations_unique_member_system_external').execute();
  await db.schema.dropIndex('event_attendance_unique_event_member').execute();

  // Drop tables in reverse order (respecting foreign key constraints)
  await db.schema.dropTable('external_integrations').execute();
  await db.schema.dropTable('sync_operations').execute();
  await db.schema.dropTable('event_attendance').execute();
  await db.schema.dropTable('events').execute();
  await db.schema.dropTable('member_memberships').execute();
  await db.schema.dropTable('membership_types').execute();
  await db.schema.dropTable('payment_statuses').execute();
  await db.schema.dropTable('members').execute();
}