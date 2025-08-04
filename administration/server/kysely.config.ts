import { defineConfig } from 'kysely-ctl';
import { SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import path from 'path';

export default defineConfig({
  dialect: new SqliteDialect({
    database: new Database(
      process.env.DATABASE_PATH || './data/club.db'
    ),
  }),
  migrations: {
    migrationFolder: './src/migrations',
  },
  seeds: {
    seedFolder: './src/seeds',
  },
});