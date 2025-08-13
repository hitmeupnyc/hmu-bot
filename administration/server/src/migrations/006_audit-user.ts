import type { Kysely } from 'kysely';

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
  // up migration code goes here...
  // note: up migrations are mandatory. you must implement this function.
  // For more info, see: https://kysely.dev/docs/migrations

  await db.schema
    .alterTable('audit_log')
    .addColumn('user_email', 'text') // Email of the user
    .execute();
    
  return await db.schema
    .alterTable('audit_log')
    .addColumn('user_id', 'text') // ID of the user
    .execute();
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
  // down migration code goes here...
  // note: down migrations are optional. you can safely delete this function.
  // For more info, see: https://kysely.dev/docs/migrations

  return await db.schema
    .alterTable('audit_log')
    .dropColumn('user_id') // ID of the user
    .dropColumn('user_email') // Email of the user
    .execute();
}
