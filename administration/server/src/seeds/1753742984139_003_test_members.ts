import type { Kysely } from 'kysely'
import type { DB } from '../types/database'

export async function seed(db: Kysely<DB>): Promise<void> {
  // Insert test members
  const memberIds = await db.insertInto('members').values([
    {
      first_name: 'Alice',
      last_name: 'Johnson', 
      preferred_name: 'Ali',
      email: 'alice.johnson@example.com',
      pronouns: 'she/they',
      sponsor_notes: 'Active community member',
      flags: 1, // active
    },
    {
      first_name: 'Johnny',
      last_name: 'Smith',
      preferred_name: 'Johnny',
      email: 'johnny.smith@example.com', 
      pronouns: 'he/him',
      sponsor_notes: 'New member',
      flags: 1, // active
    },
    {
      first_name: 'Sarah',
      last_name: 'Wilson',
      preferred_name: 'Sarah',
      email: 'sarah.wilson@example.com',
      pronouns: 'she/her',
      sponsor_notes: 'Professional affiliate',
      flags: 3, // active + professional affiliate
    }
  ]).returning('id').execute();

  // Insert member memberships
  for (const member of memberIds) {
    if (member.id !== null) {
      await db.insertInto('member_memberships').values({
        member_id: member.id,
        membership_type_id: 1, // Standard membership
        start_date: '2024-01-01',
        payment_status_id: 1, // Paid
      }).execute();
    }
  }

  console.log(`  • Added ${memberIds.length} test members with memberships`);
}
