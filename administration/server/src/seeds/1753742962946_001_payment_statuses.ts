import type { Kysely } from 'kysely'
import type { DB } from '../types/database'

export async function seed(db: Kysely<DB>): Promise<void> {
  await db.insertInto('payment_statuses').values([
    { name: 'Paid', description: 'Payment completed', sort_order: 1, flags: 1 },
    { name: 'Pending', description: 'Payment pending', sort_order: 2, flags: 1 },
    { name: 'Failed', description: 'Payment failed', sort_order: 3, flags: 1 },
  ]).execute();

  console.log('  • Added 3 payment statuses');
}
