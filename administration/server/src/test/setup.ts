import { afterEach, beforeEach, vi } from 'vitest';

// Setup and teardown for each test
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  vi.restoreAllMocks();
});

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
