import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create account table for Better Auth
  await db.schema
    .createTable('account')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey().notNull())
    .addColumn('accountId', 'text', (col) => col.notNull())
    .addColumn('providerId', 'text', (col) => col.notNull())
    .addColumn('userId', 'text', (col) => col.notNull().references('user.id'))
    .addColumn('accessToken', 'text')
    .addColumn('refreshToken', 'text')
    .addColumn('idToken', 'text')
    .addColumn('accessTokenExpiresAt', 'datetime')
    .addColumn('refreshTokenExpiresAt', 'datetime')
    .addColumn('scope', 'text')
    .addColumn('password', 'text')
    .addColumn('createdAt', 'datetime', (col) => col.notNull())
    .addColumn('updatedAt', 'datetime', (col) => col.notNull())
    .execute();

  // Create verification table for Better Auth (magic links)
  await db.schema
    .createTable('verification')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey().notNull())
    .addColumn('identifier', 'text', (col) => col.notNull())
    .addColumn('value', 'text', (col) => col.notNull())
    .addColumn('expiresAt', 'datetime', (col) => col.notNull())
    .addColumn('createdAt', 'datetime')
    .addColumn('updatedAt', 'datetime')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('verification').execute();
  await db.schema.dropTable('account').execute();
}
