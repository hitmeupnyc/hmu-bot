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
        url: 'https://example.com/community-meetup',
        flags: 1, // active
        created_by_member_id: firstMember.id,
      },
      {
        name: 'Workshop: Introduction to Kink',
        description: 'Educational workshop for newcomers',
        url: 'https://example.com/intro-workshop',
        flags: 1, // active
        created_by_member_id: firstMember.id,
      },
    ])
    .execute();

  console.log('  • Added 2 test events');
}
