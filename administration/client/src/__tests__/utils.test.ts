import { describe, it, expect } from 'vitest'
import { createMockMember, createMockEvent, createApiResponse, createApiError } from '../test/utils'

describe('Test Utilities', () => {
  describe('createMockMember', () => {
    it('should create a member with default values', () => {
      const member = createMockMember()
      
      expect(member).toHaveProperty('id', '1')
      expect(member).toHaveProperty('firstName', 'John')
      expect(member).toHaveProperty('lastName', 'Doe')
      expect(member).toHaveProperty('email', 'john.doe@example.com')
      expect(member).toHaveProperty('isActive', true)
      expect(member).toHaveProperty('isProfessionalAffiliate', false)
    })

    it('should allow overriding default values', () => {
      const member = createMockMember({
        firstName: 'Jane',
        email: 'jane@example.com',
        isProfessionalAffiliate: true
      })
      
      expect(member.firstName).toBe('Jane')
      expect(member.email).toBe('jane@example.com')
      expect(member.isProfessionalAffiliate).toBe(true)
      expect(member.lastName).toBe('Doe') // Should keep default
    })
  })

  describe('createMockEvent', () => {
    it('should create an event with default values', () => {
      const event = createMockEvent()
      
      expect(event).toHaveProperty('id', '1')
      expect(event).toHaveProperty('title', 'Test Event')
      expect(event).toHaveProperty('maxAttendees', 50)
      expect(event).toHaveProperty('currentAttendees', 10)
      expect(event).toHaveProperty('status', 'published')
    })

    it('should allow overriding default values', () => {
      const event = createMockEvent({
        title: 'Custom Event',
        maxAttendees: 100,
        status: 'draft'
      })
      
      expect(event.title).toBe('Custom Event')
      expect(event.maxAttendees).toBe(100)
      expect(event.status).toBe('draft')
      expect(event.location).toBe('Test Venue') // Should keep default
    })
  })

  describe('createApiResponse', () => {
    it('should wrap data in success response format', () => {
      const data = [{ id: 1, name: 'Test' }]
      const response = createApiResponse(data)
      
      expect(response.success).toBe(true)
      expect(response.data).toEqual(data)
      expect(response.pagination).toHaveProperty('page', 1)
      expect(response.pagination).toHaveProperty('limit', 20)
      expect(response.pagination).toHaveProperty('total', 1)
      expect(response.pagination).toHaveProperty('totalPages', 1)
    })

    it('should calculate total correctly for arrays', () => {
      const data = [1, 2, 3, 4, 5]
      const response = createApiResponse(data)
      
      expect(response.pagination.total).toBe(5)
    })

    it('should handle single objects', () => {
      const data = { id: 1, name: 'Single Item' }
      const response = createApiResponse(data)
      
      expect(response.pagination.total).toBe(1)
    })
  })

  describe('createApiError', () => {
    it('should create error response with default status', () => {
      const error = createApiError('Something went wrong')
      
      expect(error.success).toBe(false)
      expect(error.error).toBe('Something went wrong')
      expect(error.status).toBe(400)
    })

    it('should allow custom status code', () => {
      const error = createApiError('Not found', 404)
      
      expect(error.success).toBe(false)
      expect(error.error).toBe('Not found')
      expect(error.status).toBe(404)
    })
  })
})