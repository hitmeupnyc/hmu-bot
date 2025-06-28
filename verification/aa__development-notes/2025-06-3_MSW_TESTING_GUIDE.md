# MSW (Mock Service Worker) Testing Guide

## Overview

Mock Service Worker (MSW) is a powerful API mocking library that intercepts network requests at the service worker/Node.js level, providing more realistic testing scenarios than traditional function mocking. This guide covers best practices for using MSW in our verification bot test suite.

## Why MSW Over Traditional Mocks?

### **Traditional Function Mocking** (`vi.mock`)
```typescript
// ❌ Mocks the function, not the HTTP request
vi.mock('./google-sheets', () => ({
  fetchSheet: vi.fn().mockResolvedValue({ values: [['Email Address']] })
}))
```

**Problems:**
- Doesn't test actual HTTP request logic
- Misses request/response serialization issues  
- Can't test network error scenarios realistically
- Tight coupling between tests and implementation

### **MSW Network Interception** 
```typescript
// ✅ Intercepts actual HTTP requests
http.get('https://sheets.googleapis.com/v4/spreadsheets/:id/values/:range', () => {
  return HttpResponse.json({ values: [['Email Address']] })
})
```

**Benefits:**
- Tests real network request flow
- Catches serialization/deserialization bugs
- Realistic error simulation (timeouts, network failures)
- Tests remain valid as implementation changes

## MSW Setup & Configuration

### **1. Installation & Basic Setup**

```bash
npm install --save-dev msw
```

### **2. Handler Organization**

Create modular handlers by API service:

```typescript
// mocks/handlers.ts
import { http, HttpResponse } from 'msw';

// Organize by external service
export const googleSheetsHandlers = [
  http.get('https://sheets.googleapis.com/v4/spreadsheets/:sheetId/values/:range', 
    ({ params }) => {
      const { sheetId } = params;
      
      // Route by ID for different test scenarios
      switch (sheetId) {
        case 'valid-sheet-123':
          return HttpResponse.json({ values: [['Email Address']] });
        case 'empty-sheet-456': 
          return HttpResponse.json({ values: [] });
        case 'permission-denied-def':
          return HttpResponse.json(
            { error: { code: 403, message: 'Permission denied' }},
            { status: 403 }
          );
        default:
          return HttpResponse.json({ values: [['Email Address']] });
      }
    }
  ),
];

export const discordHandlers = [
  // Discord API handlers...
];

export const handlers = [
  ...googleSheetsHandlers,
  ...discordHandlers,
];
```

### **3. Test Setup Integration**

```typescript
// mocks/setup.ts
import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
```

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: ['./mocks/setup.ts'],
  },
});
```

## MSW Best Practices

### **1. Scenario-Based Handler Design**

Use URL parameters or IDs to trigger different test scenarios:

```typescript
// ✅ Good: ID-based scenario routing
const createTestOptions = (sheetId: string) => [
  { name: 'sheet-url', value: `https://docs.google.com/.../d/${sheetId}/edit` }
];

// Test different scenarios
await setup(mockEnv, createTestOptions('valid-sheet-123'));    // Success
await setup(mockEnv, createTestOptions('empty-sheet-456'));    // Empty data  
await setup(mockEnv, createTestOptions('error-sheet-789'));    // API error
```

### **2. Realistic Response Modeling**

Model actual API responses, not simplified versions:

```typescript
// ✅ Good: Real Google Sheets API response structure
http.get('*/spreadsheets/:id/values/:range', () => {
  return HttpResponse.json({
    range: 'Vetted Members!D1:D',
    majorDimension: 'ROWS',
    values: [['Email Address']]
  });
});

// ❌ Bad: Oversimplified response
http.get('*/sheets/*', () => {
  return HttpResponse.json(['Email Address']);
});
```

### **3. Dynamic Handler Overrides**

Override specific handlers for individual test scenarios:

```typescript
describe('Error Handling', () => {
  it('handles rate limiting', async () => {
    // Override global handler for this test only
    server.use(
      http.get('*/spreadsheets/rate-limit-test/values/*', () => {
        return HttpResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        );
      })
    );
    
    const result = await setup(mockEnv, createOptions('rate-limit-test'));
    expect(result.ok).toBe(false);
  });
});
```

### **4. Request Validation & Inspection**

Verify that correct requests are being made:

```typescript
it('makes correct API requests', async () => {
  const capturedRequests: string[] = [];
  
  server.use(
    http.get('*/spreadsheets/:id/values/:range', ({ request, params }) => {
      capturedRequests.push(request.url);
      
      // Verify request structure
      expect(request.headers.get('Authorization')).toBe('Bearer mock-token');
      expect(params.range).toBe('Vetted%20Members!D1');
      
      return HttpResponse.json({ values: [['Email Address']] });
    })
  );
  
  await setup(mockEnv, validOptions);
  
  expect(capturedRequests).toHaveLength(2); // Vetted + Private sheets
});
```

### **5. Error Scenario Testing**

Test realistic network and API error conditions:

```typescript
// Network timeouts
http.get('*/spreadsheets/timeout-test/*', async () => {
  await new Promise(resolve => setTimeout(resolve, 6000)); // Exceed timeout
  return HttpResponse.error();
});

// HTTP error responses  
http.get('*/spreadsheets/server-error/*', () => {
  return HttpResponse.json(
    { error: 'Internal Server Error' },
    { status: 500 }
  );
});

// Network connectivity issues
http.get('*/spreadsheets/network-error/*', () => {
  return HttpResponse.error(); // Simulates network failure
});
```

## Common Patterns & Solutions

### **1. Authentication Flow Testing**

```typescript
// OAuth token exchange
http.post('https://oauth2.googleapis.com/token', async ({ request }) => {
  const body = await request.text();
  
  if (body.includes('invalid-code')) {
    return HttpResponse.json(
      { error: 'invalid_grant' },
      { status: 400 }
    );
  }
  
  return HttpResponse.json({
    access_token: 'mock-token',
    expires_in: 3600
  });
});
```

### **2. Stateful API Simulation**

```typescript
// Simulate rate limiting with state
let requestCount = 0;

http.get('*/api/endpoint', () => {
  requestCount++;
  
  if (requestCount > 5) {
    return HttpResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }
  
  return HttpResponse.json({ data: 'success' });
});
```

### **3. Complex Response Logic**

```typescript
http.get('*/spreadsheets/:id/values/:range', ({ params, request }) => {
  const { id, range } = params;
  const url = new URL(request.url);
  
  // Parse range parameter
  const decodedRange = decodeURIComponent(range as string);
  
  if (decodedRange.includes('Vetted Members')) {
    return HttpResponse.json({
      values: [['alice@example.com'], ['bob@test.org']]
    });
  }
  
  if (decodedRange.includes('Private Members')) {
    return HttpResponse.json({
      values: [['charlie@private.com']]
    });
  }
  
  return HttpResponse.json({ values: [] });
});
```

## Integration Challenges & Solutions

### **1. Retry Logic & Timeouts**

When testing functions with retry mechanisms:

```typescript
// ⚠️ Problem: Retry logic can cause timeouts in tests
function retryRequest(fn, retries = 3) {
  return new Promise((resolve, reject) => {
    const attempt = (count) => {
      fn().then(resolve).catch((error) => {
        if (count <= 0) reject(error);
        else setTimeout(() => attempt(count - 1), 1000);
      });
    };
    attempt(retries);
  });
}

// ✅ Solution: Use MSW + fast failure for error scenarios
http.get('*/api/failing-endpoint', () => {
  return HttpResponse.json(
    { error: 'Service unavailable' },
    { status: 503 }
  );
});

// And/or mock timers to speed up retries in tests
it('handles retry logic', async () => {
  vi.useFakeTimers();
  
  const promise = retryRequest(apiCall);
  
  // Fast-forward through retry delays
  await vi.advanceTimersByTimeAsync(5000);
  
  await expect(promise).rejects.toThrow();
  
  vi.useRealTimers();
});
```

### **2. Complex Authentication Chains**

```typescript
// Handle multi-step auth flows
http.post('*/oauth/token', () => {
  return HttpResponse.json({ access_token: 'step1-token' });
});

http.get('*/api/user', ({ request }) => {
  const auth = request.headers.get('Authorization');
  
  if (auth === 'Bearer step1-token') {
    return HttpResponse.json({ id: '123', email: 'user@example.com' });
  }
  
  return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
});
```

### **3. Service Dependencies**

```typescript
// When one service depends on another
http.get('*/sheets/config', () => {
  return HttpResponse.json({ 
    apiKey: 'mock-key',
    endpoint: 'https://api.service.com/v1'
  });
});

http.get('https://api.service.com/v1/data', ({ request }) => {
  const apiKey = request.headers.get('X-API-Key');
  
  if (apiKey === 'mock-key') {
    return HttpResponse.json({ data: ['item1', 'item2'] });
  }
  
  return HttpResponse.json({ error: 'Invalid API key' }, { status: 401 });
});
```

## MSW vs Function Mocking: When to Use Each

### **Use MSW When:**
- ✅ Testing HTTP client logic
- ✅ Integration testing across service boundaries  
- ✅ Validating request/response serialization
- ✅ Testing error handling and retry logic
- ✅ E2E testing without external dependencies

### **Use Function Mocking When:**
- ✅ Unit testing pure business logic
- ✅ Mocking complex internal dependencies  
- ✅ Testing computational functions
- ✅ Fast, isolated component testing

### **Hybrid Approach:**
```typescript
// Use MSW for external HTTP APIs
server.use(
  http.get('*/external-api/*', () => HttpResponse.json({ data: 'mocked' }))
);

// Use function mocking for internal utilities
vi.mock('./utils', () => ({
  calculateHash: vi.fn().mockReturnValue('abc123'),
  validateInput: vi.fn().mockReturnValue(true)
}));
```

## Performance Considerations

### **1. Handler Efficiency**
```typescript
// ✅ Good: Fast, synchronous handlers
http.get('*/fast-endpoint', () => {
  return HttpResponse.json({ result: 'immediate' });
});

// ⚠️ Be careful: Async operations in handlers
http.get('*/slow-endpoint', async () => {
  await new Promise(resolve => setTimeout(resolve, 100)); // Keep delays minimal
  return HttpResponse.json({ result: 'delayed' });
});
```

### **2. Handler Reset Strategy**
```typescript
// Global setup
afterEach(() => {
  server.resetHandlers(); // Resets to original handlers
});

// vs per-test cleanup (more expensive)
afterEach(() => {
  server.restoreHandlers(); // Removes all handlers, re-adds defaults
});
```

### **3. Selective Mocking**
```typescript
// Mock only what you need
const minimalHandlers = [
  http.get('*/critical-api/*', () => HttpResponse.json({})),
  // Don't mock everything if not needed
];

const server = setupServer(...minimalHandlers);
```

## Debugging MSW Issues

### **1. Request Logging**
```typescript
// Add logging to handlers for debugging
http.get('*/api/*', ({ request, params }) => {
  console.log('MSW intercepted:', request.method, request.url);
  console.log('Params:', params);
  console.log('Headers:', Object.fromEntries(request.headers.entries()));
  
  return HttpResponse.json({ data: 'logged' });
});
```

### **2. Unhandled Request Detection**
```typescript
// In test setup
server.listen({ 
  onUnhandledRequest: (req) => {
    console.error('Unhandled request:', req.method, req.url);
    throw new Error(`Unhandled ${req.method} request to ${req.url}`);
  }
});
```

### **3. Handler Priority Issues**
```typescript
// Handlers are matched in order - most specific first
export const handlers = [
  // ✅ Specific routes first
  http.get('*/api/special-case', () => HttpResponse.json({})),
  
  // ✅ General routes last  
  http.get('*/api/*', () => HttpResponse.json({})),
];
```

## Migration Strategy

### **From vi.mock to MSW:**

1. **Identify HTTP boundaries** in your code
2. **Keep function mocks** for pure business logic
3. **Replace HTTP-related mocks** with MSW handlers
4. **Update tests** to use realistic data flows
5. **Add request validation** to catch integration issues

### **Example Migration:**

```typescript
// Before: Function mocking
vi.mock('./google-sheets', () => ({
  fetchSheet: vi.fn().mockResolvedValue({ values: [['Email']] })
}));

// After: MSW network interception  
http.get('*/spreadsheets/:id/values/:range', () => {
  return HttpResponse.json({ values: [['Email Address']] });
});
```

## Conclusion

MSW provides more realistic testing by intercepting actual network requests, catching integration issues that function mocking might miss. Use it for testing HTTP client code, API integrations, and error handling scenarios. Combine with traditional mocking for comprehensive test coverage.

**Key Takeaways:**
- MSW tests the **what** (network requests), not the **how** (implementation)
- Design handlers to support multiple test scenarios
- Use realistic API responses and error conditions
- Balance MSW (integration) with function mocking (unit tests)
- Monitor test performance and debug unhandled requests

---

For more advanced patterns and examples, see the test files in this repository.