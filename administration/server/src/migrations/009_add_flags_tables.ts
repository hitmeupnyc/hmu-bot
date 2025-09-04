import { Kysely, sql } from 'kysely';
import { DB } from '~/types';

export async function up(db: Kysely<DB>): Promise<void> {
  // Create flags definition table
  await db.schema
    .createTable('flags')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('name', 'text', (col) => col.notNull().unique())
    .addColumn('created_at', 'datetime', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn('updated_at', 'datetime', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();
  // Create junction table for member flags
  await db.schema
    .createTable('members_flags')
    .addColumn('member_id', 'text', (col) =>
      col.notNull().references('members.id').onDelete('cascade')
    )
    .addColumn('flag_id', 'text', (col) =>
      col.notNull().references('flags.id').onDelete('cascade')
    )
    .addColumn('granted_at', 'datetime', (col) =>
      col.defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn('granted_by', 'text') // email of granting user
    .addColumn('expires_at', 'datetime') // optional expiration
    .addColumn('metadata', 'text') // JSON for additional context
    .addPrimaryKeyConstraint('pk_members_flags', ['member_id', 'flag_id'])
    .execute();

  // Seed initial flags
  const flags = [
    // Core verification flags
    { id: 'socials_approved', name: 'Socials Approved' },
    { id: 'video_verified', name: 'Video Verified' },
    { id: 'identity_verified', name: 'Identity Verified' },
    // Subscription/tier flags
    { id: 'newsletter_public', name: 'Public' },
    { id: 'newsletter_vetted', name: 'Vetted' },
    { id: 'newsletter_private', name: 'Private' },
    // Paid subscriber tiers
    { id: 'subscriber_tip', name: 'Just The Tip' },
    { id: 'subscriber_supporter', name: 'Supporter' },
    { id: 'subscriber_more', name: 'More Please' },
    { id: 'subscriber_play', name: 'Come Play With Us' },
    { id: 'subscriber_sugar', name: 'Sugar Zaddy' },
    // Secret flags
    { id: 'curio', name: 'Curio' },
    { id: 'hmu_friend', name: 'HMU Friend' },
    // Compliance/training flags
    { id: 'guardian_certified', name: 'Guardian Certified' },
    { id: 'volunteer_lead_certified', name: 'Volunteer Lead Certified' },
    // HMU Collaborators
    { id: 'professional', name: 'Professional' },
    { id: 'instructor', name: 'HMU Instructor' },
    // Administrative flags
    { id: 'admin', name: 'HMU Admin' },
    { id: 'events_write', name: 'HMU Events Coordinator' },
    { id: 'members_write', name: 'HMU Members Coordinator' },
  ];
  if (
    (
      await (db as Kysely<any>)
        .selectFrom('flags')
        .select(db.fn.count('id').as('count'))
        .executeTakeFirst()
    )?.['count'] === 0
  ) {
    await (db as Kysely<any>)
      .insertInto('flags')
      .values(
        flags.map((flag) => ({
          ...flag,
          created_at: sql`CURRENT_TIMESTAMP`,
          updated_at: sql`CURRENT_TIMESTAMP`,
        }))
      )
      .execute();
  }
  await db.schema.alterTable('members').dropColumn('access_level').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // // Drop indexes first
  await db.schema.dropIndex('idx_members_flags_expires').execute();
  await db.schema.dropIndex('idx_members_flags_flag').execute();
  await db.schema.dropIndex('idx_members_flags_member').execute();
  // // Drop tables
  await db.schema.dropTable('members_flags').execute();
  await db.schema.dropTable('flags').execute();
  await db.schema
    .alterTable('members')
    .addColumn('access_level', 'integer')
    .execute();
}
