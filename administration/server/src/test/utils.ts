import Database from 'better-sqlite3'
import { Kysely, SqliteDialect } from 'kysely'
import type { DatabaseSchema } from '../types/database'

// Create test database instance
export function createTestDatabase(): Kysely<DatabaseSchema> {
  const db = new Database(':memory:')
  
  return new Kysely<DatabaseSchema>({
    dialect: new SqliteDialect({
      database: db,
    }),
  })
}

// Mock data factories
export const createMockMember = (overrides = {}) => ({
  id: '1',
  first_name: 'John',
  last_name: 'Doe',
  preferred_name: 'Johnny',
  email: 'john.doe@example.com',
  pronouns: 'he/him',
  status: 'active',
  membership_type: 'standard',
  join_date: '2024-01-01',
  sponsor_notes: '',
  is_active: 1,
  is_professional_affiliate: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

export const createMockEvent = (overrides = {}) => ({
  id: '1',
  title: 'Test Event',
  description: 'A test event',
  start_time: '2024-06-01T19:00:00Z',
  end_time: '2024-06-01T22:00:00Z',
  location: 'Test Venue',
  max_attendees: 50,
  current_attendees: 10,
  status: 'published',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

export const createMockApplication = (overrides = {}) => ({
  id: '1',
  name: 'Jane Smith',
  preferred_name: 'Janie',
  pronouns: 'she/her',
  email: 'jane.smith@example.com',
  birth_year: 1990,
  primary_url: 'https://example.com/janesmith',
  referral_source: 'Friend/Word of mouth',
  sponsor_name: 'Alice Johnson',
  sponsor_can_email: 1,
  kink_experience: 'Some experience with community events',
  about_self: 'Creative professional interested in community',
  consent_understanding: 'Ongoing enthusiastic agreement',
  additional_info: 'Looking forward to learning more',
  status: 'pending',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

// API response helpers
export const createApiResponse = <T>(data: T) => ({
  success: true,
  data,
  pagination: {
    page: 1,
    limit: 20,
    total: Array.isArray(data) ? data.length : 1,
    totalPages: 1,
  },
})

export const createApiError = (message: string, status = 400) => ({
  success: false,
  error: message,
  status,
})

// Database test helpers
export async function seedTestDatabase(db: Kysely<DatabaseSchema>) {
  // Create tables (simplified schema for testing)
  await db.schema
    .createTable('members')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('first_name', 'text', (col) => col.notNull())
    .addColumn('last_name', 'text', (col) => col.notNull())
    .addColumn('preferred_name', 'text')
    .addColumn('email', 'text', (col) => col.notNull().unique())
    .addColumn('pronouns', 'text')
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('active'))
    .addColumn('membership_type', 'text', (col) => col.notNull().defaultTo('standard'))
    .addColumn('join_date', 'text')
    .addColumn('sponsor_notes', 'text')
    .addColumn('is_active', 'integer', (col) => col.notNull().defaultTo(1))
    .addColumn('is_professional_affiliate', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .execute()

  await db.schema
    .createTable('events')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('title', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('start_time', 'text', (col) => col.notNull())
    .addColumn('end_time', 'text', (col) => col.notNull())
    .addColumn('location', 'text')
    .addColumn('max_attendees', 'integer')
    .addColumn('current_attendees', 'integer', (col) => col.defaultTo(0))
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('draft'))
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .execute()
}