import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { DB as DatabaseSchema } from '../types/database';
import { MigrationProvider } from './MigrationProvider';

// Module-scoped singleton variables
let _db: Kysely<DatabaseSchema>;
let _sqliteDb: Database.Database;
let _migrationProvider: MigrationProvider;
let _initialized = false;

// Initialize the database connection
function initializeDatabase(): void {
  if (_initialized) return;
  
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/club.db');
  
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

// Get the raw SQLite database instance
export function getSqliteDb(): Database.Database {
  if (!_initialized) {
    initializeDatabase();
  }
  return _sqliteDb;
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

// Get database instance (legacy compatibility)
export function getDatabase(): Kysely<DatabaseSchema> {
  return getDb();
}

// Close database connections
export async function close(): Promise<void> {
  if (_db) {
    await _db.destroy();
  }
  if (_sqliteDb) {
    _sqliteDb.close();
  }
  _initialized = false;
}

// Transaction helper
export async function transaction<T>(fn: (trx: Kysely<DatabaseSchema>) => Promise<T>): Promise<T> {
  return await getDb().transaction().execute(fn);
}

// Legacy compatibility methods for gradual migration
export function prepare(sql: string): Database.Statement {
  return getSqliteDb().prepare(sql);
}

export function legacyTransaction<T>(fn: () => T): T {
  return getSqliteDb().transaction(fn)();
}

// Migration management methods
export async function migrateUp(): Promise<void> {
  if (!_initialized) {
    initializeDatabase();
  }
  await _migrationProvider.migrateToLatest();
}

export async function migrateDown(): Promise<void> {
  if (!_initialized) {
    initializeDatabase();
  }
  await _migrationProvider.migrateDown();
}

export async function getMigrationStatus() {
  if (!_initialized) {
    initializeDatabase();
  }
  return await _migrationProvider.getMigrationStatus();
}
