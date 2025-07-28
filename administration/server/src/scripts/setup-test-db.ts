#!/usr/bin/env tsx

import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { MigrationProvider } from '../services/MigrationProvider';
import type { DB as DatabaseSchema } from '../types/database';

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

    // Seed test data
    console.log('🌱 Seeding test data...');
    await seedTestData(db);

    console.log('✅ Test database setup complete!');
    console.log(`📍 Database location: ${TEST_DB_PATH}`);
    
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  } finally {
    await db.destroy();
    sqliteDb.close();
  }
}

async function seedTestData(db: Kysely<DatabaseSchema>) {
  // Insert payment statuses
  await db.insertInto('payment_statuses').values([
    { name: 'Paid', description: 'Payment completed', sort_order: 1, flags: 1 },
    { name: 'Pending', description: 'Payment pending', sort_order: 2, flags: 1 },
    { name: 'Failed', description: 'Payment failed', sort_order: 3, flags: 1 },
  ]).execute();

  // Insert membership types
  await db.insertInto('membership_types').values([
    { 
      name: 'Standard', 
      description: 'Standard membership', 
      price_cents: 5000, 
      flags: 3, // active + recurring
      benefits_json: JSON.stringify(['Access to events', 'Community Discord'])
    },
    { 
      name: 'Professional', 
      description: 'Professional affiliate membership', 
      price_cents: 2500, 
      flags: 3,
      benefits_json: JSON.stringify(['Professional networking', 'Event discounts'])
    },
  ]).execute();

  // Insert test members
  const memberIds = await db.insertInto('members').values([
    {
      first_name: 'Alice',
      last_name: 'Johnson', 
      preferred_name: 'Ali',
      email: 'alice.johnson@example.com',
      pronouns: 'she/they',
      sponsor_notes: 'Active community member',
      flags: 1, // active
    },
    {
      first_name: 'Johnny',
      last_name: 'Smith',
      preferred_name: 'Johnny',
      email: 'johnny.smith@example.com', 
      pronouns: 'he/him',
      sponsor_notes: 'New member',
      flags: 1, // active
    },
    {
      first_name: 'Sarah',
      last_name: 'Wilson',
      preferred_name: 'Sarah',
      email: 'sarah.wilson@example.com',
      pronouns: 'she/her',
      sponsor_notes: 'Professional affiliate',
      flags: 3, // active + professional affiliate
    }
  ]).returning('id').execute();

  // Insert member memberships
  for (const member of memberIds) {
    await db.insertInto('member_memberships').values({
      member_id: member.id,
      membership_type_id: 1, // Standard membership
      start_date: '2024-01-01',
      payment_status_id: 1, // Paid
    }).execute();
  }

  // Insert test events
  await db.insertInto('events').values([
    {
      name: 'Community Meetup',
      description: 'Monthly community gathering',
      start_datetime: '2024-12-15T19:00:00Z',
      end_datetime: '2024-12-15T22:00:00Z',
      flags: 3, // active + public
      max_capacity: 50,
      created_by_member_id: memberIds[0].id,
    },
    {
      name: 'Workshop: Introduction to Kink',
      description: 'Educational workshop for newcomers',
      start_datetime: '2024-12-20T18:00:00Z', 
      end_datetime: '2024-12-20T21:00:00Z',
      flags: 3, // active + public
      max_capacity: 25,
      created_by_member_id: memberIds[0].id,
    },
  ]).execute();

  console.log(`  • Added ${memberIds.length} test members`);
  console.log('  • Added 2 payment statuses');
  console.log('  • Added 2 membership types'); 
  console.log('  • Added 2 test events');
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupTestDatabase().catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

export { setupTestDatabase, TEST_DB_PATH };
