#!/usr/bin/env tsx

import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { MigrationProvider } from '../services/MigrationProvider';
import type { DB as DatabaseSchema } from '../types/database';

const execAsync = promisify(exec);
const TEST_DB_PATH = path.join(__dirname, '../../../data/test.db');

async function setupTestDatabase() {
  console.log('🧪 Setting up test database...');
  
  // Remove existing test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
    console.log('🗑️  Removed existing test database');
  }

  // Ensure data directory exists
  const dbDir = path.dirname(TEST_DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Create new SQLite database
  const sqliteDb = new Database(TEST_DB_PATH);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');

  // Create Kysely instance
  const db = new Kysely<DatabaseSchema>({
    dialect: new SqliteDialect({
      database: sqliteDb,
    }),
  });

  try {
    // Run migrations using proper migration system
    console.log('📝 Running database migrations...');
    const migrationProvider = new MigrationProvider(db);
    await migrationProvider.migrateToLatest();

    // Close database connection before running seeds
    await db.destroy();
    sqliteDb.close();

    // Seed test data using Kysely seed functionality
    console.log('🌱 Seeding test data...');
    await runSeeds();

    console.log('✅ Test database setup complete!');
    console.log(`📍 Database location: ${TEST_DB_PATH}`);
    
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    await db.destroy();
    sqliteDb.close();
    throw error;
  }
}

async function runSeeds() {
  try {
    // Set DATABASE_PATH to point to test database for seeding
    const env = { 
      ...process.env, 
      DATABASE_PATH: TEST_DB_PATH 
    };
    
    const { stdout, stderr } = await execAsync('npx kysely seed run', { 
      cwd: path.join(__dirname, '..', '..'),
      env 
    });
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error: any) {
    console.error('Failed to run seeds:', error.message);
    throw error;
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupTestDatabase().catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

export { setupTestDatabase, TEST_DB_PATH };
