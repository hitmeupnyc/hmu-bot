// import { Kysely, sql } from 'kysely';

// export async function up(db: Kysely<any>): Promise<void> {
//   // Create flags definition table
//   await db.schema
//     .createTable('flags')
//     .addColumn('id', 'text', (col) => col.primaryKey())
//     .addColumn('name', 'text', (col) => col.notNull().unique())
//     .addColumn('description', 'text')
//     .addColumn('category', 'text') // 'verification', 'subscription', 'feature', 'compliance', 'admin'
//     .addColumn('created_at', 'datetime', (col) =>
//       col.defaultTo(sql`CURRENT_TIMESTAMP`)
//     )
//     .addColumn('updated_at', 'datetime', (col) =>
//       col.defaultTo(sql`CURRENT_TIMESTAMP`)
//     )
//     .execute();

//   // Create junction table for member flags
//   await db.schema
//     .createTable('members_flags')
//     .addColumn('member_id', 'text', (col) =>
//       col.notNull().references('members.id').onDelete('cascade')
//     )
//     .addColumn('flag_id', 'text', (col) =>
//       col.notNull().references('flags.id').onDelete('cascade')
//     )
//     .addColumn('granted_at', 'datetime', (col) =>
//       col.defaultTo(sql`CURRENT_TIMESTAMP`)
//     )
//     .addColumn('granted_by', 'text') // email of granting user
//     .addColumn('expires_at', 'datetime') // optional expiration
//     .addColumn('metadata', 'text') // JSON for additional context
//     .addPrimaryKeyConstraint('pk_members_flags', ['member_id', 'flag_id'])
//     .execute();

//   // Create indexes for performance
//   await db.schema
//     .createIndex('idx_members_flags_member')
//     .on('members_flags')
//     .column('member_id')
//     .execute();

//   await db.schema
//     .createIndex('idx_members_flags_flag')
//     .on('members_flags')
//     .column('flag_id')
//     .execute();

//   await db.schema
//     .createIndex('idx_members_flags_expires')
//     .on('members_flags')
//     .column('expires_at')
//     .where('expires_at', 'is not', null)
//     .execute();

//   // Seed initial flags
//   const flags = [
//     // Core verification flags
//     {
//       id: 'email_verified',
//       name: 'Email Verified',
//       description: 'Member has verified their email address',
//       category: 'verification',
//     },
//     {
//       id: 'phone_verified',
//       name: 'Phone Verified',
//       description: 'Member has verified their phone number',
//       category: 'verification',
//     },
//     {
//       id: 'identity_verified',
//       name: 'Identity Verified',
//       description: 'Member identity has been verified',
//       category: 'verification',
//     },

//     // Subscription/tier flags
//     {
//       id: 'premium_member',
//       name: 'Premium Member',
//       description: 'Has active premium membership',
//       category: 'subscription',
//     },
//     {
//       id: 'founding_member',
//       name: 'Founding Member',
//       description: 'Original founding member',
//       category: 'subscription',
//     },
//     {
//       id: 'lifetime_member',
//       name: 'Lifetime Member',
//       description: 'Lifetime membership granted',
//       category: 'subscription',
//     },

//     // Feature access flags
//     {
//       id: 'beta_features',
//       name: 'Beta Features',
//       description: 'Access to beta features',
//       category: 'feature',
//     },
//     {
//       id: 'api_access',
//       name: 'API Access',
//       description: 'Can access API endpoints',
//       category: 'feature',
//     },
//     {
//       id: 'bulk_operations',
//       name: 'Bulk Operations',
//       description: 'Can perform bulk operations',
//       category: 'feature',
//     },

//     // Compliance/training flags
//     {
//       id: 'safety_trained',
//       name: 'Safety Trained',
//       description: 'Completed safety training',
//       category: 'compliance',
//     },
//     {
//       id: 'background_checked',
//       name: 'Background Checked',
//       description: 'Passed background check',
//       category: 'compliance',
//     },
//     {
//       id: 'volunteer_certified',
//       name: 'Volunteer Certified',
//       description: 'Certified to volunteer at events',
//       category: 'compliance',
//     },

//     // Administrative flags
//     {
//       id: 'can_moderate',
//       name: 'Can Moderate',
//       description: 'Can moderate content and members',
//       category: 'admin',
//     },
//     {
//       id: 'can_manage_events',
//       name: 'Can Manage Events',
//       description: 'Can create and manage events',
//       category: 'admin',
//     },
//     {
//       id: 'can_manage_integrations',
//       name: 'Can Manage Integrations',
//       description: 'Can configure integrations',
//       category: 'admin',
//     },
//   ];

//   for (const flag of flags) {
//     await db
//       .insertInto('flags')
//       .values({
//         ...flag,
//         created_at: sql`CURRENT_TIMESTAMP`,
//         updated_at: sql`CURRENT_TIMESTAMP`,
//       })
//       .execute();
//   }

//   // Migrate existing access_level to flags
//   // Get all members with their access levels
//   const members = await db
//     .selectFrom('members')
//     .select(['id', 'email', 'access_level'])
//     .execute();

//   for (const member of members) {
//     if (!member.email) continue;

//     const flagsToGrant = [];

//     // Grant the flags
//     for (const flagId of flagsToGrant) {
//       await db
//         .insertInto('members_flags')
//         .values({
//           member_id: member.id,
//           flag_id: flagId,
//           granted_by: 'migration@system',
//           granted_at: sql`CURRENT_TIMESTAMP`,
//         })
//         .execute();
//     }
//   }
// }

// export async function down(db: Kysely<any>): Promise<void> {
//   // Drop indexes first
//   await db.schema.dropIndex('idx_members_flags_expires').execute();
//   await db.schema.dropIndex('idx_members_flags_flag').execute();
//   await db.schema.dropIndex('idx_members_flags_member').execute();

//   // Drop tables
//   await db.schema.dropTable('members_flags').execute();
//   await db.schema.dropTable('flags').execute();
// }
