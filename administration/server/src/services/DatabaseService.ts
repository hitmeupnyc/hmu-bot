import dotenv from 'dotenv';

import Database from 'better-sqlite3';
import fs from 'fs';
import { Kysely, SqliteDialect } from 'kysely';
import path from 'path';
import type { DB as DatabaseSchema } from '../types/database';
import { MigrationProvider } from './MigrationProvider';

dotenv.config();

// Module-scoped singleton variables
let _db: Kysely<DatabaseSchema>;
let _sqliteDb: Database.Database;
let _migrationProvider: MigrationProvider;
let _initialized = false;

const dbPath: string = process.env.DATABASE_PATH || '';
if (!dbPath) {
  throw new Error('DATABASE_PATH is not set');
}

// Initialize the database connection
function initializeDatabase(): void {
  if (_initialized) return;

  // Ensure data directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Create the better-sqlite3 instance
  _sqliteDb = new Database(dbPath);
  _sqliteDb.pragma('journal_mode = WAL');
  _sqliteDb.pragma('foreign_keys = ON');

  // Create Kysely instance with SqliteDialect
  _db = new Kysely<DatabaseSchema>({
    dialect: new SqliteDialect({
      database: _sqliteDb,
    }),
  });

  // Initialize migration provider
  _migrationProvider = new MigrationProvider(_db);
  _initialized = true;
}

// Get the Kysely database instance
export function getDb(): Kysely<DatabaseSchema> {
  if (!_initialized) {
    initializeDatabase();
  }
  return _db;
}

// Initialize database and run migrations
export async function initialize(): Promise<void> {
  if (!_initialized) {
    initializeDatabase();
  }

  try {
    console.log('🔄 Running database migrations...');
    await _migrationProvider.migrateToLatest();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Legacy compatibility methods for gradual migration
export function prepare(sql: string): Database.Statement {
  if (!_initialized) {
    initializeDatabase();
  }
  return _sqliteDb.prepare(sql);
}
