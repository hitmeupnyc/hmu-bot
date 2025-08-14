import type { Kysely } from 'kysely';
import type { DB } from '../types';

export async function seed(db: Kysely<DB>): Promise<void> {
  // Get the first member ID to use as event creator
  const firstMember = await db
    .selectFrom('members')
    .select('id')
    .limit(1)
    .executeTakeFirst();

  if (!firstMember) {
    console.log('  • No members found, skipping event creation');
    return;
  }

  // Insert test events
  await db
    .insertInto('events')
    .values([
      {
        name: 'Community Meetup',
        description: 'Monthly community gathering',
        start_datetime: '2024-12-15T19:00:00Z',
        end_datetime: '2024-12-15T22:00:00Z',
        flags: 3, // active + public
        max_capacity: 50,
        created_by_member_id: firstMember.id,
      },
      {
        name: 'Workshop: Introduction to Kink',
        description: 'Educational workshop for newcomers',
        start_datetime: '2024-12-20T18:00:00Z',
        end_datetime: '2024-12-20T21:00:00Z',
        flags: 3, // active + public
        max_capacity: 25,
        created_by_member_id: firstMember.id,
      },
    ])
    .execute();

  console.log('  • Added 2 test events');
}
