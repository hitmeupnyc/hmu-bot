import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Mirror complete Eventbrite event data for sync service
  await db.schema
    .createTable('eventbrite_events')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('eventbrite_id', 'text', (col) => col.unique().notNull()) // Eventbrite's event ID
    .addColumn('name_text', 'text')
    .addColumn('name_html', 'text')
    .addColumn('description_text', 'text')
    .addColumn('description_html', 'text')
    .addColumn('url', 'text')
    .addColumn('start_utc', 'text')
    .addColumn('end_utc', 'text')
    .addColumn('start_timezone', 'text')
    .addColumn('end_timezone', 'text')
    .addColumn('start_local', 'text')
    .addColumn('end_local', 'text')
    .addColumn('capacity', 'integer')
    .addColumn('status', 'integer', (col) => col.defaultTo(1)) // Bitfield: 1=draft, 2=live, 4=ended, 8=canceled
    .addColumn('category_id', 'text')
    .addColumn('subcategory_id', 'text')
    .addColumn('format_id', 'text')
    .addColumn('show_remaining', 'integer', (col) => col.defaultTo(1)) // boolean as int
    .addColumn('venue_json', 'text') // Complete venue data from Eventbrite
    .addColumn('organizer_json', 'text') // Complete organizer data from Eventbrite
    .addColumn('ticket_classes_json', 'text') // Array of ticket classes
    .addColumn('raw_eventbrite_data', 'text') // Complete API response for debugging. TODO: remove this column when we're confident we're not going to need it.
    .addColumn('last_synced_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('sync_hash', 'text') // Hash of key fields to detect changes
    .addColumn('flags', 'integer', (col) => col.defaultTo(1)) // Bitfield: 1=active, 2=sync_error, 4=sync_paused, 8=is_free, 16=is_online_event, 32=is_reserved_seating
    .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // Marketing copy and content for events (separate from Eventbrite data)
  await db.schema
    .createTable('events_marketing')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('event_id', 'integer', (col) => col.notNull().references('events.id'))
    .addColumn('primary_marketing_copy', 'text') // Main marketing message
    .addColumn('secondary_marketing_copy', 'text') // Supporting marketing content
    .addColumn('blurb', 'text') // Short description/tagline
    .addColumn('social_media_copy', 'text') // Optimized for social sharing
    .addColumn('email_subject', 'text') // For email campaigns
    .addColumn('email_preview_text', 'text') // Email preview/preheader text
    .addColumn('seo_title', 'text') // SEO optimized title
    .addColumn('seo_description', 'text') // Meta description for SEO
    .addColumn('hashtags', 'text') // JSON array of hashtags
    .addColumn('marketing_images_json', 'text') // Array of marketing image URLs/metadata
    .addColumn('key_selling_points', 'text') // JSON array of key selling points
    .addColumn('created_by_member_id', 'integer', (col) => col.references('members.id'))
    .addColumn('flags', 'integer', (col) => col.defaultTo(1)) // Bitfield: 1=active, 2=approved
    .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // Volunteer coordination for events
  await db.schema
    .createTable('events_volunteers')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('event_id', 'integer', (col) => col.notNull().references('events.id'))
    .addColumn('member_id', 'integer', (col) => col.notNull().references('members.id'))
    .addColumn('role', 'text', (col) => col.notNull()) // 'coordinator', 'setup', 'greeter', 'tech', 'cleanup', etc.
    .addColumn('contact_phone', 'text')
    .addColumn('contact_email', 'text')
    .addColumn('arrival_time', 'text') // When volunteer should arrive
    .addColumn('departure_time', 'text') // Expected departure time
    .addColumn('special_instructions', 'text')
    .addColumn('equipment_needed', 'text') // JSON array of equipment/supplies
    .addColumn('skills_required', 'text') // JSON array of required skills
    .addColumn('volunteer_notes', 'text') // Notes from the volunteer
    .addColumn('coordinator_notes', 'text') // Notes from event coordinator
    .addColumn('confirmed_at', 'text') // When volunteer confirmed participation
    .addColumn('checked_in_at', 'text') // When volunteer arrived
    .addColumn('checked_out_at', 'text') // When volunteer finished
    .addColumn('hours_worked', 'real') // Actual hours worked
    .addColumn('flags', 'integer', (col) => col.defaultTo(1)) // Bitfield: 1=active, 2=confirmed, 4=lead_volunteer
    .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // Enhanced attendance tracking with more detailed information
  await db.schema
    .createTable('events_attendance')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('event_id', 'integer', (col) => col.notNull().references('events.id'))
    .addColumn('member_id', 'integer', (col) => col.references('members.id')) // NULL for non-members
    .addColumn('eventbrite_attendee_id', 'text') // Link to Eventbrite attendee
    .addColumn('eventbrite_order_id', 'text') // Link to Eventbrite order
    .addColumn('ticket_type', 'text') // Type of ticket purchased
    .addColumn('registration_date', 'text') // When they registered
    .addColumn('attendance_source', 'integer', (col) => col.defaultTo(1)) // Bitfield: 1=manual, 2=eventbrite, 4=door_scan, 8=qr_code, etc.
    .addColumn('check_in_method', 'text') // 'manual', 'qr_scan', 'nfc', etc.
    .addColumn('marketing_source', 'text') // How they heard about the event
    .addColumn('notes', 'text')
    .addColumn('flags', 'integer', (col) => col.defaultTo(1)) // TODO: Bitfield for stuff like "attended", "no-show", "refunded", etc.
    .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // Join table for events linked to Eventbrite events
  await db.schema
    .createTable('events_eventbrite_link')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('event_id', 'integer', (col) => col.notNull().references('events.id'))
    .addColumn('eventbrite_event_id', 'integer', (col) => col.notNull().references('eventbrite_events.id'))
    .addColumn('sync_direction', 'text', (col) => col.defaultTo('bidirectional')) // 'from_eventbrite', 'to_eventbrite', 'bidirectional'
    .addColumn('last_synced_at', 'text')
    .addColumn('sync_status', 'text', (col) => col.defaultTo('active')) // 'active', 'paused', 'error'
    .addColumn('sync_errors', 'text') // JSON array of sync error messages
    .addColumn('flags', 'integer', (col) => col.defaultTo(1)) // Bitfield: 1=active, 2=sync_error, 4=sync_paused
    .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // Add unique constraint for events_eventbrite_link
  await db.schema
    .createIndex('events_eventbrite_link_unique_event_eventbrite')
    .on('events_eventbrite_link')
    .columns(['event_id', 'eventbrite_event_id'])
    .unique()
    .execute();

  // Add unique constraint for volunteer roles (one person per role per event)
  await db.schema
    .createIndex('events_volunteers_unique_event_member_role')
    .on('events_volunteers')
    .columns(['event_id', 'member_id', 'role'])
    .unique()
    .execute();

  // Create performance indexes
  await db.schema.createIndex('idx_eventbrite_events_eventbrite_id').on('eventbrite_events').column('eventbrite_id').execute();
  await db.schema.createIndex('idx_eventbrite_events_status').on('eventbrite_events').column('status').execute();
  await db.schema.createIndex('idx_eventbrite_events_start_local').on('eventbrite_events').column('start_local').execute();
  await db.schema.createIndex('idx_events_marketing_event_id').on('events_marketing').column('event_id').execute();
  await db.schema.createIndex('idx_events_volunteers_event_id').on('events_volunteers').column('event_id').execute();
  await db.schema.createIndex('idx_events_volunteers_member_id').on('events_volunteers').column('member_id').execute();
  await db.schema.createIndex('idx_events_volunteers_role').on('events_volunteers').column('role').execute();
  await db.schema.createIndex('idx_events_attendance_event_id').on('events_attendance').column('event_id').execute();
  await db.schema.createIndex('idx_events_attendance_member_id').on('events_attendance').column('member_id').execute();
  await db.schema.createIndex('idx_events_attendance_eventbrite_attendee_id').on('events_attendance').column('eventbrite_attendee_id').execute();
  await db.schema.createIndex('idx_events_eventbrite_link_event_id').on('events_eventbrite_link').column('event_id').execute();
  await db.schema.createIndex('idx_events_eventbrite_link_eventbrite_event_id').on('events_eventbrite_link').column('eventbrite_event_id').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop indexes first
  await db.schema.dropIndex('idx_events_eventbrite_link_eventbrite_event_id').execute();
  await db.schema.dropIndex('idx_events_eventbrite_link_event_id').execute();
  await db.schema.dropIndex('idx_events_attendance_eventbrite_attendee_id').execute();
  await db.schema.dropIndex('idx_events_attendance_member_id').execute();
  await db.schema.dropIndex('idx_events_attendance_event_id').execute();
  await db.schema.dropIndex('idx_events_volunteers_role').execute();
  await db.schema.dropIndex('idx_events_volunteers_member_id').execute();
  await db.schema.dropIndex('idx_events_volunteers_event_id').execute();
  await db.schema.dropIndex('idx_events_marketing_event_id').execute();
  await db.schema.dropIndex('idx_eventbrite_events_start_local').execute();
  await db.schema.dropIndex('idx_eventbrite_events_status').execute();
  await db.schema.dropIndex('idx_eventbrite_events_eventbrite_id').execute();
  await db.schema.dropIndex('events_volunteers_unique_event_member_role').execute();
  await db.schema.dropIndex('events_eventbrite_link_unique_event_eventbrite').execute();

  // Drop tables in reverse order (respecting foreign key constraints)
  await db.schema.dropTable('events_eventbrite_link').execute();
  await db.schema.dropTable('events_attendance').execute();
  await db.schema.dropTable('events_volunteers').execute();
  await db.schema.dropTable('events_marketing').execute();
  await db.schema.dropTable('eventbrite_events').execute();
}
