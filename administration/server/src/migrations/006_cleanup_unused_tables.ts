import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
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
    .addColumn('created_at', 'text', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn('processed_at', 'text')
    .execute();

  // External system integrations tracking
  await db.schema
    .createTable('external_integrations')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('member_id', 'integer', (col) =>
      col.notNull().references('members.id')
    )
    .addColumn('system_name', 'text', (col) => col.notNull()) // 'eventbrite', 'patreon', 'discord', 'kayvio'
    .addColumn('external_id', 'text', (col) => col.notNull())
    .addColumn('external_data_json', 'text') // store relevant external data
    .addColumn('last_synced_at', 'text')
    .addColumn('flags', 'integer', (col) => col.defaultTo(1)) // Bitfield: 1=active
    .execute();

  // Drop unused Eventbrite tables
  await sql`DROP TABLE IF EXISTS eventbrite_events`.execute(db);
  await sql`DROP TABLE IF EXISTS events_eventbrite_link`.execute(db);

  // Drop unused attendance tables (both old and new schemas)
  await sql`DROP TABLE IF EXISTS event_attendance`.execute(db);
  await sql`DROP TABLE IF EXISTS events_attendance`.execute(db);

  // Drop unused membership tracking (we'll track differently)
  await sql`DROP TABLE IF EXISTS member_memberships`.execute(db);
  await sql`DROP TABLE IF EXISTS membership_types`.execute(db);
  await sql`DROP TABLE IF EXISTS payment_statuses`.execute(db);

  // Drop unused Better Auth tables (using session-only auth)
  await sql`DROP TABLE IF EXISTS account`.execute(db);
  await sql`DROP TABLE IF EXISTS verification`.execute(db);

  try {
    db.schema
      .alterTable('events')
      .dropColumn('required_membership_types')
      .execute();
  } catch (error) {
    console.error('Failed to drop required_membership_types column:', error);
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  // Note: This migration is destructive and cannot be easily reversed
  // The original table schemas would need to be recreated from previous migrations
  // throw new Error(
  console.error(
    'This migration cannot be reversed - data has been permanently deleted'
  );
}
