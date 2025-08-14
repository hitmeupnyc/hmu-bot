import type { Kysely } from 'kysely';
import type { DB } from '../types';

export async function seed(db: Kysely<DB>): Promise<void> {
  await db
    .insertInto('membership_types')
    .values([
      {
        name: 'Standard',
        description: 'Standard membership',
        price_cents: 5000,
        flags: 3, // active + recurring
        benefits_json: JSON.stringify([
          'Access to events',
          'Community Discord',
        ]),
      },
      {
        name: 'Professional',
        description: 'Professional affiliate membership',
        price_cents: 2500,
        flags: 3,
        benefits_json: JSON.stringify([
          'Professional networking',
          'Event discounts',
        ]),
      },
    ])
    .execute();

  console.log('  • Added 2 membership types');
}
