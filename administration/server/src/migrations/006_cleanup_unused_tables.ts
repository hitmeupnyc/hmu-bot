import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
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
