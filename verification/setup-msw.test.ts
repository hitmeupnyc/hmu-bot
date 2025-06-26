import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/setup';
import { setup, setupFailureReasons } from './index';
import { mockEnv } from './fixtures/setup-data';

// Don't mock the google-sheets module - let MSW intercept the fetch calls
// vi.mock('./google-sheets');

// Test options using different sheet IDs for MSW scenarios
const createOptions = (sheetId: string) => [
  {
    name: "sheet-url" as const,
    type: 3,
    value: `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=0`,
  },
  {
    name: "vetted-role" as const,
    type: 8,
    value: "vetted-role-id-123",
  },
  {
    name: "private-role" as const,
    type: 8,
    value: "private-role-id-456",
  },
];

describe('Setup Function with MSW', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('URL Validation', () => {
    it('extracts document ID from valid Google Sheets URL', async () => {
      const result = await setup(mockEnv, createOptions('valid-sheet-123'));

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual(['Email Address', 'Email Address']);
      }
    });

    it('rejects invalid URLs', async () => {
      const invalidOptions = [
        {
          name: "sheet-url" as const,
          type: 3,
          value: "https://example.com/not-a-sheet",
        },
        {
          name: "vetted-role" as const,
          type: 8,
          value: "vetted-role-id",
        },
        {
          name: "private-role" as const,
          type: 8,
          value: "private-role-id",
        },
      ];

      const result = await setup(mockEnv, invalidOptions);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe(setupFailureReasons.invalidUrl);
      }
    });
  });

  describe('Sheet Structure Validation with MSW', () => {
    it('validates correct sheet structure', async () => {
      const result = await setup(mockEnv, createOptions('valid-sheet-123'));

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual(['Email Address', 'Email Address']);
      }
    });

    it('rejects sheets with wrong column headers', async () => {
      const result = await setup(mockEnv, createOptions('wrong-headers-789'));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe(setupFailureReasons.wrongHeadings);
      }
    });

    it('handles empty sheet responses', async () => {
      const result = await setup(mockEnv, createOptions('empty-sheet-456'));

      // Empty values array results in empty columnHeadings array
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual([]);
      }
    });

    it('handles malformed sheet responses', async () => {
      const result = await setup(mockEnv, createOptions('malformed-data-abc'));

      // flatMap flattens: [null, 'Email Address', 'Extra Column'] 
      // every() fails because null !== 'Email Address'
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe(setupFailureReasons.wrongHeadings);
      }
    });
  });

  describe('Error Handling with MSW', () => {
    it('handles Google Sheets API permission errors', async () => {
      const result = await setup(mockEnv, createOptions('permission-denied-def'));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe(setupFailureReasons.errorFetching);
      }
    });

    it('handles network errors', async () => {
      const result = await setup(mockEnv, createOptions('network-error-ghi'));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe(setupFailureReasons.errorFetching);
      }
    });

    it('logs errors when sheet fetching fails', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      await setup(mockEnv, createOptions('network-error-ghi'));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[ERR\]/),
        expect.any(Error)
      );
    });
  });

  describe('Dynamic Handler Testing', () => {
    it('can override handlers for specific test scenarios', async () => {
      // Override the handler for this specific test
      server.use(
        http.get('https://sheets.googleapis.com/v4/spreadsheets/custom-test-123/values/*', () => {
          return HttpResponse.json({
            values: [['Custom Test Column']]
          });
        })
      );

      const result = await setup(mockEnv, createOptions('custom-test-123'));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe(setupFailureReasons.wrongHeadings);
      }
    });

    it('can simulate server timeouts', async () => {
      // Override with a timeout simulation
      server.use(
        http.get('https://sheets.googleapis.com/v4/spreadsheets/timeout-test-456/values/*', async () => {
          // Simulate a timeout by delaying and then returning an error
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.error();
        })
      );

      const result = await setup(mockEnv, createOptions('timeout-test-456'));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe(setupFailureReasons.errorFetching);
      }
    });
  });

  describe('Request Validation', () => {
    it('verifies correct API requests are made', async () => {
      let requestCount = 0;
      const requestUrls: string[] = [];

      // Override to capture request details
      server.use(
        http.get('https://sheets.googleapis.com/v4/spreadsheets/request-test-789/values/*', ({ request }) => {
          requestCount++;
          requestUrls.push(request.url);
          
          return HttpResponse.json({
            values: [['Email Address']]
          });
        })
      );

      await setup(mockEnv, createOptions('request-test-789'));

      expect(requestCount).toBe(2); // Two requests for vetted and private sheets
      expect(requestUrls).toHaveLength(2);
      expect(requestUrls[0]).toContain('Vetted%20Members!D1');
      expect(requestUrls[1]).toContain('Private%20Members!D1');
    });
  });
});