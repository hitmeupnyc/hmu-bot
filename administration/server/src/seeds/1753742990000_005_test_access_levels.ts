import type { Kysely } from 'kysely';
import type { DB } from '../types';

export async function seed(db: Kysely<DB>): Promise<void> {
  // Update test members with different access levels
  // Access levels: 1=member, 2=moderator, 3=admin, 4=super_admin

  // TODO: update these with the latest architecture
  const accessUpdates = [
    { email: 'alice.johnson@example.com' }, // admin
    { email: 'johnny.smith@example.com' }, // member
    { email: 'sarah.wilson@example.com' }, // moderator (professional affiliate)
    { email: 'mike.chen@example.com' }, // member
    { email: 'jordan.taylor@example.com' }, // moderator (professional affiliate)
    { email: 'emma.davis@example.com' }, // member
    { email: 'alex.martinez@example.com' }, // member
    { email: 'rebecca.thompson@example.com' }, // super_admin (professional affiliate)
    { email: 'sam.rodriguez@example.com' }, // member
    { email: 'chris.anderson@example.com' }, // moderator
  ];

  for (const update of accessUpdates) {
    // await db.updateTable('members').where('email', '=', update.email).execute();
  }

  console.log(
    `  • Updated access levels for ${accessUpdates.length} test members`
  );
}
