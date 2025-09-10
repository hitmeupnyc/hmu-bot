import { Kysely, sql } from 'kysely';
import { DB } from '~/types';

export async function up(db: Kysely<DB>): Promise<void> {
  await db.transaction().execute(async (trx) => {
    // Create junction table for event flags
    await trx.schema
      .createTable('events_flags')
      .addColumn('event_id', 'integer', (col) =>
        col.notNull().references('events.id').onDelete('cascade')
      )
      .addColumn('flag_id', 'text', (col) =>
        col.notNull().references('flags.id').onDelete('cascade')
      )
      .addColumn('granted_at', 'datetime', (col) =>
        col.defaultTo(sql`CURRENT_TIMESTAMP`)
      )
      .addColumn('granted_by', 'text') // email of granting user
      .addColumn('expires_at', 'datetime') // optional expiration
      .addColumn('metadata', 'text') // JSON for additional context
      .addPrimaryKeyConstraint('pk_events_flags', ['event_id', 'flag_id'])
      .execute();

    // Create indexes for performance
    await trx.schema
      .createIndex('idx_events_flags_event')
      .on('events_flags')
      .column('event_id')
      .execute();

    await trx.schema
      .createIndex('idx_events_flags_flag')
      .on('events_flags')
      .column('flag_id')
      .execute();

    await trx.schema
      .createIndex('idx_events_flags_expires')
      .on('events_flags')
      .column('expires_at')
      .where('expires_at', 'is not', null)
      .execute();
  });
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.transaction().execute(async (trx) => {
    // Drop indexes first
    await trx.schema.dropIndex('idx_events_flags_expires').execute();
    await trx.schema.dropIndex('idx_events_flags_flag').execute();
    await trx.schema.dropIndex('idx_events_flags_event').execute();
    
    // Drop table
    await trx.schema.dropTable('events_flags').execute();
  });
}