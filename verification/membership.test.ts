import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/setup';
import { checkMembership } from './index';
import { init } from './google-sheets';
import { 
  mockEnv, 
  membershipTestData,
  createMockContextWithSheet,
  createMockContextWithoutSheet 
} from './fixtures/membership-data';

describe('Membership Checking Logic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console mocks
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Initialize Google Sheets module with test private key
    init('test-private-key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Email Membership Validation', () => {
    it('finds member in vetted list only', async () => {
      const context = createMockContextWithSheet('vetted-only-members');
      
      const result = await checkMembership(context, 'vetted1@example.com');

      expect(result.isVetted).toBe(true);
      expect(result.isPrivate).toBe(false);
    });

    it('finds member in private list only', async () => {
      const context = createMockContextWithSheet('private-only-members');
      
      const result = await checkMembership(context, 'private1@example.com');

      expect(result.isVetted).toBe(false);
      expect(result.isPrivate).toBe(true);
    });

    it('finds member in both lists', async () => {
      const context = createMockContextWithSheet('both-lists-members');
      
      const result = await checkMembership(context, 'both@example.com');

      expect(result.isVetted).toBe(true);
      expect(result.isPrivate).toBe(true);
    });

    it('returns false when member not found in either list', async () => {
      const context = createMockContextWithSheet('empty-members');
      
      const result = await checkMembership(context, 'notfound@example.com');

      expect(result.isVetted).toBe(false);
      expect(result.isPrivate).toBe(false);
    });
  });

  describe('Case-Insensitive Matching', () => {
    it('matches mixed case emails correctly', async () => {
      const context = createMockContextWithSheet('mixed-case-members');

      // Test various case combinations
      const testCases = [
        'UPPERCASE@EXAMPLE.COM',
        'lowercase@example.com',
        'MixedCase@Example.Com',
        'camelCase@gmail.com',
      ];

      for (const email of testCases) {
        const result = await checkMembership(context, email);
        expect(result.isVetted).toBe(true);
      }
    });

    it('handles email substring matching', async () => {
      // Use dynamic override for this specific test
      server.use(
        http.get('https://sheets.googleapis.com/v4/spreadsheets/email-substring-test/values/*', ({ params }) => {
          const range = decodeURIComponent(params.range as string);
          if (range.includes('Vetted Members')) {
            return HttpResponse.json({
              values: [
                ['test+tag@gmail.com'], 
                ['user+newsletter@company.co.uk']
              ]
            });
          }
          return HttpResponse.json({ values: [] });
        })
      );

      const context = createMockContextWithSheet('email-substring-test');

      // The includes() logic means 'test' will match 'test+tag@gmail.com'
      const result1 = await checkMembership(context, 'test');
      expect(result1.isVetted).toBe(true);

      // But exact email without tag won't match the +tag version in sheet
      const result2 = await checkMembership(context, 'test@gmail.com');
      expect(result2.isVetted).toBe(false);
      
      // Exact match should work
      const result3 = await checkMembership(context, 'test+tag@gmail.com');
      expect(result3.isVetted).toBe(true);
    });
  });

  describe('Malformed Data Handling', () => {
    it('handles empty sheet values gracefully', async () => {
      const context = createMockContextWithSheet('empty-members');
      
      const result = await checkMembership(context, 'test@example.com');

      expect(result.isVetted).toBe(false);
      expect(result.isPrivate).toBe(false);
    });

    it('handles null and undefined entries in sheet data', async () => {
      const context = createMockContextWithSheet('malformed-members');
      
      const result = await checkMembership(context, 'valid@example.com');

      expect(result.isVetted).toBe(true);
      expect(result.isPrivate).toBe(false);
    });

    it('handles unexpected data structures', async () => {
      // Use dynamic override for complex malformed data
      server.use(
        http.get('https://sheets.googleapis.com/v4/spreadsheets/complex-malformed/values/*', ({ params }) => {
          const range = decodeURIComponent(params.range as string);
          if (range.includes('Vetted Members')) {
            return HttpResponse.json({
              values: [
                [], // Empty row
                ['single-value'], // Single item
                ['first', 'second', 'third'], // Multiple items
                [null, 'test@example.com', undefined], // Mixed with nulls
              ]
            });
          }
          return HttpResponse.json({ values: [] });
        })
      );

      const context = createMockContextWithSheet('complex-malformed');
      
      const result = await checkMembership(context, 'valid@example.com');

      expect(result.isVetted).toBe(true);
      expect(result.isPrivate).toBe(false);
    });
  });

  describe('Error Scenarios', () => {
    it('throws error when sheet document ID is missing', async () => {
      const contextWithoutSheet = createMockContextWithoutSheet();

      await expect(checkMembership(contextWithoutSheet, 'test@example.com')).rejects.toThrow(
        "no 'sheet' in KV store"
      );
    });

    it('throws error when vetted sheet is missing values', async () => {
      const context = createMockContextWithSheet('missing-values-members');

      await expect(checkMembership(context, 'test@example.com')).rejects.toThrow(
        "Couldn't find the Vetted list."
      );
    });

    it('throws error when private sheet is missing values', async () => {
      // Use dynamic override to simulate private sheet missing values
      server.use(
        http.get('https://sheets.googleapis.com/v4/spreadsheets/private-missing-values/values/*', ({ params }) => {
          const range = decodeURIComponent(params.range as string);
          if (range.includes('Vetted Members')) {
            return HttpResponse.json({
              values: [['test@example.com']]
            });
          } else if (range.includes('Private Members')) {
            return HttpResponse.json({
              range: range,
              majorDimension: 'ROWS',
              values: null  // Explicitly null values
            });
          }
          return HttpResponse.json({ values: [] });
        })
      );

      const context = createMockContextWithSheet('private-missing-values');

      await expect(checkMembership(context, 'test@example.com')).rejects.toThrow(
        "Couldn't find the Private list."
      );
    });

    it('handles network failures when fetching sheets', async () => {
      const context = createMockContextWithSheet('network-error-members');

      await expect(checkMembership(context, 'test@example.com')).rejects.toThrow();
    });

    it('handles invalid sheet ranges', async () => {
      // Use dynamic override to simulate invalid range error
      server.use(
        http.get('https://sheets.googleapis.com/v4/spreadsheets/invalid-range-test/values/*', () => {
          return HttpResponse.json(
            { error: { code: 400, message: 'Invalid range' } },
            { status: 400 }
          );
        })
      );

      const context = createMockContextWithSheet('invalid-range-test');

      await expect(checkMembership(context, 'test@example.com')).rejects.toThrow();
    });
  });

  describe('Logging and Debugging', () => {
    it('logs membership status for debugging', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const context = createMockContextWithSheet('vetted-only-members');
      
      await checkMembership(context, 'vetted1@example.com');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[checkMembership] vetted1@example.com is vetted and not private'
      );
    });

    it('logs when member is found in both lists', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const context = createMockContextWithSheet('both-lists-members');
      
      await checkMembership(context, 'both@example.com');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[checkMembership] both@example.com is vetted and private'
      );
    });

    it('logs when member is not found in either list', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const context = createMockContextWithSheet('empty-members');
      
      await checkMembership(context, 'notfound@example.com');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[checkMembership] notfound@example.com is not vetted and not private'
      );
    });
  });

  describe('Sheet Fetching Behavior', () => {
    it('fetches both sheets in parallel', async () => {
      const capturedRequests: string[] = [];
      
      server.use(
        http.get('https://sheets.googleapis.com/v4/spreadsheets/request-tracking/values/*', ({ request, params }) => {
          capturedRequests.push(request.url);
          
          const range = decodeURIComponent(params.range as string);
          if (range.includes('Vetted Members')) {
            return HttpResponse.json({ values: [['test@example.com']] });
          } else if (range.includes('Private Members')) {
            return HttpResponse.json({ values: [] });
          }
          return HttpResponse.json({ values: [] });
        })
      );

      const context = createMockContextWithSheet('request-tracking');
      await checkMembership(context, 'test@example.com');

      expect(capturedRequests).toHaveLength(2);
      expect(capturedRequests[0]).toContain('Vetted%20Members!C2%3AC');
      expect(capturedRequests[1]).toContain('Private%20Members!C2%3AC');
    });

    it('uses correct sheet ID from KV store', async () => {
      const capturedSheetIds: string[] = [];
      
      server.use(
        http.get('https://sheets.googleapis.com/v4/spreadsheets/:sheetId/values/*', ({ params }) => {
          capturedSheetIds.push(params.sheetId as string);
          return HttpResponse.json({ values: [['test@example.com']] });
        })
      );

      const customSheetId = 'custom-membership-sheet-123';
      const context = createMockContextWithSheet(customSheetId);
      
      await checkMembership(context, 'test@example.com');

      expect(capturedSheetIds).toHaveLength(2);
      expect(capturedSheetIds[0]).toBe(customSheetId);
      expect(capturedSheetIds[1]).toBe(customSheetId);
    });

    it('makes requests with correct authentication headers', async () => {
      const capturedHeaders: string[] = [];
      
      server.use(
        http.get('https://sheets.googleapis.com/v4/spreadsheets/auth-test/values/*', ({ request }) => {
          const authHeader = request.headers.get('Authorization');
          if (authHeader) {
            capturedHeaders.push(authHeader);
          }
          return HttpResponse.json({ values: [['test@example.com']] });
        })
      );

      const context = createMockContextWithSheet('auth-test');
      await checkMembership(context, 'test@example.com');

      expect(capturedHeaders).toHaveLength(2);
      capturedHeaders.forEach(header => {
        expect(header).toMatch(/^Bearer/);
      });
    });
  });

  describe('Integration with Email Processing', () => {
    it('processes emails through cleanEmail function', async () => {
      // Use the predefined handler that should work
      const context = createMockContextWithSheet('mixed-case-members');
      
      // Input email should be cleaned (lowercased) and matched via includes
      const result = await checkMembership(context, 'uppercase@example.com');
      expect(result.isVetted).toBe(true);
    });

    it('handles email case sensitivity correctly', async () => {
      server.use(
        http.get('https://sheets.googleapis.com/v4/spreadsheets/case-sensitivity/values/*', ({ params }) => {
          const range = decodeURIComponent(params.range as string);
          if (range.includes('Vetted Members')) {
            return HttpResponse.json({
              values: [['test@example.com']] // Lowercase in sheet
            });
          }
          return HttpResponse.json({ values: [] });
        })
      );

      const context = createMockContextWithSheet('case-sensitivity');
      
      // Different case combinations should all match because cleanEmail converts to lowercase 
      // and includes() will match the cleaned email with the sheet value
      const testCases = [
        'test@example.com',
        'TEST@EXAMPLE.COM', 
        'Test@Example.com',
        'TeSt@ExAmPlE.cOm'
      ];

      for (const email of testCases) {
        const result = await checkMembership(context, email);
        expect(result.isVetted).toBe(true);
      }
    });
  });
});