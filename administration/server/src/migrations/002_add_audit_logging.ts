import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Audit log for tracking all data changes and user actions
  await db.schema
    .createTable('audit_log')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('entity_type', 'text', (col) => col.notNull()) // 'member', 'event', 'membership', etc.
    .addColumn('entity_id', 'integer') // ID of the affected entity
    .addColumn('action', 'text', (col) => col.notNull()) // 'create', 'update', 'delete', 'view', 'search'
    .addColumn('user_session_id', 'text') // Session identifier for tracking user actions
    .addColumn('user_ip', 'text') // IP address of the user
    .addColumn('old_values_json', 'text') // JSON of previous values (for updates/deletes)
    .addColumn('new_values_json', 'text') // JSON of new values (for creates/updates)
    .addColumn('metadata_json', 'text') // Additional context (search terms, filters, etc.)
    .addColumn('created_at', 'text', (col) => col.defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // Create indexes for performance
  await db.schema
    .createIndex('idx_audit_log_entity')
    .on('audit_log')
    .columns(['entity_type', 'entity_id'])
    .execute();
    
  await db.schema
    .createIndex('idx_audit_log_session')
    .on('audit_log')
    .column('user_session_id')
    .execute();
    
  await db.schema
    .createIndex('idx_audit_log_created')
    .on('audit_log')
    .column('created_at')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop indexes first
  await db.schema.dropIndex('idx_audit_log_created').execute();
  await db.schema.dropIndex('idx_audit_log_session').execute();
  await db.schema.dropIndex('idx_audit_log_entity').execute();
  
  // Drop table
  await db.schema.dropTable('audit_log').execute();
}