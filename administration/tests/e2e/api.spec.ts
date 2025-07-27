import { test, expect } from '@playwright/test';

test.describe('API Endpoints', () => {
  test('should respond to health check', async ({ request }) => {
    const response = await request.get('http://localhost:3000/health');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('status', 'healthy');
    expect(data).toHaveProperty('timestamp');
  });

  test('should return empty members list', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/members');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBeTruthy();
    expect(data).toHaveProperty('pagination');
  });

  test('should return empty events list', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/events');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBeTruthy();
  });

  test('should handle 404 for non-existent routes', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/nonexistent');
    expect(response.status()).toBe(404);
    
    const data = await response.json();
    expect(data).toHaveProperty('error', 'Route not found');
  });
});