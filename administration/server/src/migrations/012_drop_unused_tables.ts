import { Kysely, sql } from 'kysely';
import { DB } from '~/types';

export async function up(db: Kysely<DB>): Promise<void> {
  await db.transaction().execute(async (trx) => {
    // Drop tables that are no longer needed
    // These tables were created but are not being used in the current application

    // Drop events marketing and volunteers tables (not being used)
    await trx.schema.dropTable('events_marketing').execute();
    await trx.schema.dropTable('events_volunteers').execute();
    
    // Drop external systems integration tables (not being used)
    await trx.schema.dropTable('external_integrations').execute();
    await trx.schema.dropTable('sync_operations').execute();
    
    // Drop any indexes that might have been created for these tables
    // (safely ignore errors if indexes don't exist)
    const indexesToDrop = [
      'idx_events_marketing_event_id',
      'idx_events_volunteers_event_id', 
      'idx_events_volunteers_member_id',
      'idx_events_volunteers_role',
      'idx_external_integrations_lookup',
      'idx_sync_operations_status',
      'events_volunteers_unique_event_member_role',
      'external_integrations_unique_member_system_external'
    ];

    for (const indexName of indexesToDrop) {
      try {
        await trx.schema.dropIndex(indexName).execute();
      } catch {
        // Index might not exist, ignore
      }
    }
  });
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.transaction().execute(async (trx) => {
    // Recreate sync_operations table
    await trx.schema
      .createTable('sync_operations')
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('platform', 'text', (col) => col.notNull())
      .addColumn('operation_type', 'text', (col) => col.notNull())
      .addColumn('external_id', 'text')
      .addColumn('member_id', 'integer', (col) => col.references('members.id'))
      .addColumn('status', 'text', (col) => col.notNull())
      .addColumn('payload_json', 'text')
      .addColumn('error_message', 'text')
      .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('processed_at', 'text')
      .execute();

    // Recreate external_integrations table
    await trx.schema
      .createTable('external_integrations')
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('member_id', 'integer', (col) => col.notNull().references('members.id'))
      .addColumn('system_name', 'text', (col) => col.notNull())
      .addColumn('external_id', 'text', (col) => col.notNull())
      .addColumn('external_data_json', 'text')
      .addColumn('last_synced_at', 'text')
      .addColumn('flags', 'integer', (col) => col.defaultTo(1))
      .execute();

    // Recreate events_volunteers table
    await trx.schema
      .createTable('events_volunteers')
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('event_id', 'integer', (col) => col.notNull().references('events.id'))
      .addColumn('member_id', 'integer', (col) => col.notNull().references('members.id'))
      .addColumn('role', 'text', (col) => col.notNull())
      .addColumn('contact_phone', 'text')
      .addColumn('contact_email', 'text')
      .addColumn('arrival_time', 'text')
      .addColumn('departure_time', 'text')
      .addColumn('special_instructions', 'text')
      .addColumn('equipment_needed', 'text')
      .addColumn('skills_required', 'text')
      .addColumn('volunteer_notes', 'text')
      .addColumn('coordinator_notes', 'text')
      .addColumn('confirmed_at', 'text')
      .addColumn('checked_in_at', 'text')
      .addColumn('checked_out_at', 'text')
      .addColumn('hours_worked', 'real')
      .addColumn('flags', 'integer', (col) => col.defaultTo(1))
      .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();

    // Recreate events_marketing table
    await trx.schema
      .createTable('events_marketing')
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('event_id', 'integer', (col) => col.notNull().references('events.id'))
      .addColumn('primary_marketing_copy', 'text')
      .addColumn('secondary_marketing_copy', 'text')
      .addColumn('blurb', 'text')
      .addColumn('social_media_copy', 'text')
      .addColumn('email_subject', 'text')
      .addColumn('email_preview_text', 'text')
      .addColumn('seo_title', 'text')
      .addColumn('seo_description', 'text')
      .addColumn('hashtags', 'text')
      .addColumn('marketing_images_json', 'text')
      .addColumn('key_selling_points', 'text')
      .addColumn('created_by_member_id', 'integer', (col) => col.references('members.id'))
      .addColumn('flags', 'integer', (col) => col.defaultTo(1))
      .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();

    // Recreate indexes
    await trx.schema.createIndex('idx_events_marketing_event_id').on('events_marketing').column('event_id').execute();
    await trx.schema.createIndex('idx_events_volunteers_event_id').on('events_volunteers').column('event_id').execute();
    await trx.schema.createIndex('idx_events_volunteers_member_id').on('events_volunteers').column('member_id').execute();
    await trx.schema.createIndex('idx_events_volunteers_role').on('events_volunteers').column('role').execute();
    await trx.schema.createIndex('idx_external_integrations_lookup').on('external_integrations').columns(['member_id', 'system_name']).execute();
    await trx.schema.createIndex('idx_sync_operations_status').on('sync_operations').columns(['platform', 'status']).execute();
    
    // Unique constraints
    await trx.schema
      .createIndex('events_volunteers_unique_event_member_role')
      .on('events_volunteers')
      .columns(['event_id', 'member_id', 'role'])
      .unique()
      .execute();
      
    await trx.schema
      .createIndex('external_integrations_unique_member_system_external')
      .on('external_integrations')
      .columns(['member_id', 'system_name', 'external_id'])
      .unique()
      .execute();
      
    console.log('  • Recreated tables: events_marketing, events_volunteers, external_integrations, sync_operations');
  });
}