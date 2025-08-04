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

