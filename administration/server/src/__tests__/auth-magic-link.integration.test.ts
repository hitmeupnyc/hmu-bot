/**
 * Integration tests for Magic Link authentication flow
 * Tests magic link functionality by hitting the actual running development server
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Magic Link Authentication Integration', () => {
  // Use the development server that's already running
  const serverUrl = 'http://localhost:3000'

  describe('POST /api/auth/sign-in/magic-link', () => {
    it('should send a magic link for valid email', async () => {
      const response = await fetch(`${serverUrl}/api/auth/sign-in/magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com'
        }),
      })

      expect(response.status).toBe(200)
      
      const responseData = await response.json()
      expect(responseData).toMatchObject({
        message: 'Magic link sent to test@example.com',
        data: {
          email: 'test@example.com',
          success: true
        }
      })

      // Verify response indicates magic link was sent
      // Note: Console logging happens in server process, not accessible in tests
    })

    it('should handle invalid email format', async () => {
      const response = await fetch(`${serverUrl}/api/auth/sign-in/magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'invalid-email'
        }),
      })

      expect(response.status).toBe(400)
    })

    it('should handle missing email', async () => {
      const response = await fetch(`${serverUrl}/api/auth/sign-in/magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(400)
    })

    it('should handle CORS preflight requests', async () => {
      const response = await fetch(`${serverUrl}/api/auth/sign-in/magic-link`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:5173',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type',
        },
      })

      expect(response.status).toBe(204)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173')
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST')
    })
  })

  describe('GET /api/auth/get-session', () => {
    it('should return null session when not authenticated', async () => {
      const response = await fetch(`${serverUrl}/api/auth/get-session`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      expect(response.status).toBe(200)
      
      const sessionData = await response.json()
      expect(sessionData).toMatchObject({
        user: null,
        session: null
      })
    })

    it('should handle session validation with invalid cookie', async () => {
      const response = await fetch(`${serverUrl}/api/auth/get-session`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'better-auth.session_token=invalid-token'
        },
      })

      expect(response.status).toBe(200)
      
      const sessionData = await response.json()
      expect(sessionData).toMatchObject({
        user: null,
        session: null
      })
    })
  })

  describe('POST /api/auth/sign-out', () => {
    it('should handle sign out request', async () => {
      const response = await fetch(`${serverUrl}/api/auth/sign-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      expect(response.status).toBe(200)
      
      const responseData = await response.json()
      expect(responseData).toMatchObject({
        message: 'Successfully signed out'
      })
    })
  })

  describe('GET /api/auth/test', () => {
    it('should return auth API status', async () => {
      const response = await fetch(`${serverUrl}/api/auth/test`, {
        method: 'GET',
      })

      expect(response.status).toBe(200)
      
      const responseData = await response.json()
      expect(responseData).toMatchObject({
        message: 'Auth API is working',
        data: {
          timestamp: expect.any(String)
        }
      })
    })
  })

  describe('Magic Link Flow Integration', () => {
    it('should generate valid magic link response', async () => {
      // Send magic link request
      const response = await fetch(`${serverUrl}/api/auth/sign-in/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'integration-test@example.com' }),
      })

      expect(response.status).toBe(200)
      
      const responseData = await response.json()
      expect(responseData).toMatchObject({
        message: 'Magic link sent to integration-test@example.com',
        data: {
          email: 'integration-test@example.com',
          success: true
        }
      })
    })

    it('should handle multiple magic link requests', async () => {
      const emails = ['user1@test.com', 'user2@test.com', 'user3@test.com']
      
      for (const email of emails) {
        const response = await fetch(`${serverUrl}/api/auth/sign-in/magic-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        expect(response.status).toBe(200)
        
        const responseData = await response.json()
        expect(responseData.data.email).toBe(email)
        expect(responseData.data.success).toBe(true)
      }
    })

    it('should include proper observability metadata', async () => {
      const response = await fetch(`${serverUrl}/api/auth/sign-in/magic-link`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Request-ID': 'test-request-123'
        },
        body: JSON.stringify({ email: 'observability-test@example.com' }),
      })

      expect(response.status).toBe(200)
      
      // Verify response headers for observability
      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await fetch(`${serverUrl}/api/auth/sign-in/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      expect(response.status).toBe(400)
    })

    it('should handle missing content-type header', async () => {
      const response = await fetch(`${serverUrl}/api/auth/sign-in/magic-link`, {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      // Should still work as the body is valid JSON
      expect([200, 400]).toContain(response.status)
    })

    it('should handle empty request body', async () => {
      const response = await fetch(`${serverUrl}/api/auth/sign-in/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '',
      })

      expect(response.status).toBe(400)
    })
  })
})