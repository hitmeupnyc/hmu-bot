import { describe, it, expect } from 'vitest'
import { createTestDatabase, createMockMember } from '../test/utils'

describe('Basic Setup', () => {
  it('should create a test database', () => {
    const db = createTestDatabase()
    expect(db).toBeDefined()
  })

  it('should create mock member data', () => {
    const member = createMockMember()
    expect(member).toHaveProperty('id')
    expect(member).toHaveProperty('first_name', 'John')
    expect(member).toHaveProperty('last_name', 'Doe')
    expect(member).toHaveProperty('email', 'john.doe@example.com')
  })

  it('should allow overriding mock data', () => {
    const member = createMockMember({ 
      first_name: 'Jane',
      email: 'jane@example.com' 
    })
    expect(member.first_name).toBe('Jane')
    expect(member.email).toBe('jane@example.com')
    expect(member.last_name).toBe('Doe') // Should keep default
  })
})