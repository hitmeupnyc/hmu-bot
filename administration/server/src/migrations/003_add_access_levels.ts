import type { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Add access_level column to members table
  await db.schema
    .alterTable('members')
    .addColumn('access_level', 'integer', (col) => col.defaultTo(1))
    .execute()

  console.log('  • Added access_level column to members table')
}

export async function down(db: Kysely<any>): Promise<void> {
  // Remove access_level column
  await db.schema
    .alterTable('members')
    .dropColumn('access_level')
    .execute()

  console.log('  • Removed access_level column from members table')
}