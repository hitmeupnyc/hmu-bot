import { expect, test } from '@playwright/test';

test.describe('API Endpoints', () => {
  test('should respond to health check', async ({ request }) => {
    const response = await request.get('http://localhost:5173/api/health');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('status', 'healthy');
    expect(data).toHaveProperty('timestamp');
  });

  test('should return empty members list', async ({ request }) => {
    const response = await request.get('http://localhost:5173/api/members');
    expect(response.ok()).toBeTruthy();

    const res = await response.json();
    expect(res).toHaveProperty('data');
    expect(Array.isArray(res.data)).toBeTruthy();
    expect(res).toHaveProperty('page');
  });

  test('should return empty events list', async ({ request }) => {
    const response = await request.get('http://localhost:5173/api/events');
    expect(response.ok()).toBeTruthy();

    const res = await response.json();
    expect(res).toHaveProperty('data');
    expect(Array.isArray(res.data)).toBeTruthy();
  });

  test('should handle 404 for non-existent routes', async ({ request }) => {
    const response = await request.get('http://localhost:5173/api/nonexistent');
    expect(response.status()).toBe(404);

    const res = await response.json();
    expect(res.ok).toBe(false);
    expect(res.status).toBe(404);
  });
});
