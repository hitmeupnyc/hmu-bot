import Database from 'better-sqlite3';
import { SqliteDialect } from 'kysely';
import { defineConfig } from 'kysely-ctl';

console.log('DATABASE_PATH', process.env.DATABASE_PATH);

export default defineConfig({
  dialect: new SqliteDialect({
    database: new Database(process.env.DATABASE_PATH || './data/club.db'),
  }),
  migrations: {
    migrationFolder: './src/migrations',
  },
  seeds: {
    seedFolder: './src/seeds',
  },
});
