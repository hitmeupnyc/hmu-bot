import type { Kysely } from 'kysely'
import type { DB } from '../types/database'

export async function seed(db: Kysely<DB>): Promise<void> {
  // Update test members with different access levels
  // Access levels: 1=member, 2=moderator, 3=admin, 4=super_admin
  
  const accessUpdates = [
    { email: 'alice.johnson@example.com', access_level: 3 }, // admin
    { email: 'johnny.smith@example.com', access_level: 1 }, // member
    { email: 'sarah.wilson@example.com', access_level: 2 }, // moderator (professional affiliate)
    { email: 'mike.chen@example.com', access_level: 1 }, // member
    { email: 'jordan.taylor@example.com', access_level: 2 }, // moderator (professional affiliate)
    { email: 'emma.davis@example.com', access_level: 1 }, // member
    { email: 'alex.martinez@example.com', access_level: 1 }, // member
    { email: 'rebecca.thompson@example.com', access_level: 4 }, // super_admin (professional affiliate)
    { email: 'sam.rodriguez@example.com', access_level: 1 }, // member
    { email: 'chris.anderson@example.com', access_level: 2 }, // moderator
  ]

  for (const update of accessUpdates) {
    await db
      .updateTable('members')
      .set({ access_level: update.access_level } as any)
      .where('email', '=', update.email)
      .execute()
  }

  console.log(`  • Updated access levels for ${accessUpdates.length} test members`)
}