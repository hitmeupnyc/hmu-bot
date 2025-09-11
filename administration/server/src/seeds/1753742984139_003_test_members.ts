import type { Kysely } from 'kysely';
import type { DB } from '../types';

export async function seed(db: Kysely<DB>): Promise<void> {
  // Insert test members with diverse profiles
  const memberIds = await db
    .insertInto('members')
    .values([
      {
        first_name: 'Alice',
        last_name: 'Johnson',
        preferred_name: 'Ali',
        email: 'alice.johnson@example.com',
        pronouns: 'she/they',
        sponsor_notes: 'Active community member, great at organizing events',
        flags: 1, // active
      },
      {
        first_name: 'Johnny',
        last_name: 'Smith',
        preferred_name: 'Johnny',
        email: 'johnny.smith@example.com',
        pronouns: 'he/him',
        sponsor_notes: 'New member, very enthusiastic',
        flags: 1, // active
      },
      {
        first_name: 'Sarah',
        last_name: 'Wilson',
        preferred_name: 'Sarah',
        email: 'sarah.wilson@example.com',
        pronouns: 'she/her',
        sponsor_notes: 'Professional affiliate, works in healthcare',
        flags: 3, // active + professional affiliate
      },
      {
        first_name: 'Michael',
        last_name: 'Chen',
        preferred_name: 'Mike',
        email: 'mike.chen@example.com',
        pronouns: 'he/him',
        sponsor_notes: 'Inactive member, moved out of town',
        flags: 0, // inactive
      },
      {
        first_name: 'Jordan',
        last_name: 'Taylor',
        preferred_name: 'Jordan',
        email: 'jordan.taylor@example.com',
        pronouns: 'they/them',
        sponsor_notes: 'Professional affiliate in tech industry',
        flags: 3, // active + professional affiliate
      },
      {
        first_name: 'Emma',
        last_name: 'Davis',
        preferred_name: null,
        email: 'emma.davis@example.com',
        pronouns: 'she/her',
        sponsor_notes: 'Regular attendee, good friend of Alice',
        flags: 1, // active
      },
      {
        first_name: 'Alex',
        last_name: 'Martinez',
        preferred_name: 'Alex',
        email: 'alex.martinez@example.com',
        pronouns: 'he/they',
        sponsor_notes: 'On hiatus for personal reasons',
        flags: 0, // inactive
      },
      {
        first_name: 'Dr. Rebecca',
        last_name: 'Thompson',
        preferred_name: 'Becca',
        email: 'rebecca.thompson@example.com',
        pronouns: 'she/her',
        sponsor_notes:
          'Professional affiliate, licensed therapist specializing in sexuality',
        flags: 3, // active + professional affiliate
      },
      {
        first_name: 'Sam',
        last_name: 'Rodriguez',
        preferred_name: 'Sammy',
        email: 'sam.rodriguez@example.com',
        pronouns: 'they/them',
        sponsor_notes: 'Enthusiastic newcomer, great energy',
        flags: 1, // active
      },
      {
        first_name: 'Chris',
        last_name: 'Anderson',
        preferred_name: null,
        email: 'chris.anderson@example.com',
        pronouns: 'he/him',
        sponsor_notes: 'Long-time member, helps with venue setup',
        flags: 1, // active
      },
    ])
    .returning('id')
    .execute();

  console.log(`  • Added ${memberIds.length} test members`);
}
