import { Kysely, sql } from 'kysely';
import { DB } from '~/types';

export async function up(db: Kysely<DB>): Promise<void> {
  await db.transaction().execute(async (trx) => {
    // First, drop any indexes that reference columns we're about to drop
    try {
      await trx.schema.dropIndex('idx_events_datetime').execute();
    } catch {
      // Index might not exist, ignore
    }

    // Step 1: Add new url column (if it doesn't exist)
    try {
      await trx.schema
        .alterTable('events')
        .addColumn('url', 'text')
        .execute();
    } catch {
      // Column might already exist from failed migration, ignore
    }

    // Step 2: Copy eventbrite_url data to url column
    await sql`UPDATE events SET url = eventbrite_url WHERE eventbrite_url IS NOT NULL`.execute(trx);

    // Step 3: Make url NOT NULL (but first set a default for any null values)
    await sql`UPDATE events SET url = 'https://example.com' WHERE url IS NULL`.execute(trx);

    // Step 4: Drop the old columns we no longer need
    await trx.schema
      .alterTable('events')
      .dropColumn('start_datetime')
      .execute();

    await trx.schema
      .alterTable('events')
      .dropColumn('end_datetime')
      .execute();

    await trx.schema
      .alterTable('events')
      .dropColumn('max_capacity')
      .execute();

    await trx.schema
      .alterTable('events')
      .dropColumn('eventbrite_id')
      .execute();

    await trx.schema
      .alterTable('events')
      .dropColumn('eventbrite_url')
      .execute();

    await trx.schema
      .alterTable('events')
      .dropColumn('created_at')
      .execute();

    await trx.schema
      .alterTable('events')
      .dropColumn('updated_at')
      .execute();

    // Note: We keep the existing 'flags' column for special-case bitfield flags
  });
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.transaction().execute(async (trx) => {
    // Restore the dropped columns
    await trx.schema
      .alterTable('events')
      .addColumn('start_datetime', 'text')
      .addColumn('end_datetime', 'text')
      .addColumn('max_capacity', 'integer')
      .addColumn('eventbrite_id', 'text')
      .addColumn('eventbrite_url', 'text')
      .addColumn('created_at', 'datetime', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'datetime', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();

    // Copy url back to eventbrite_url
    await sql`UPDATE events SET eventbrite_url = url WHERE url IS NOT NULL`.execute(trx);

    // Drop the url column
    await trx.schema
      .alterTable('events')
      .dropColumn('url')
      .execute();
  });
}