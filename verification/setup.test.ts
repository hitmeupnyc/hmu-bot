import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setup, setupFailureReasons } from './index';
import {
  mockEnv,
  validSetupOptions,
  invalidUrlOptions,
  missingUrlOptions,
  validSheetResponse,
  invalidSheetResponse,
  networkErrorResponse,
  emptySheetResponse,
} from './fixtures/setup-data';

// Mock the fetchSheet function from google-sheets module
vi.mock('./google-sheets', () => ({
  fetchSheet: vi.fn(),
  init: vi.fn(() => ({ alreadyHadToken: true, reloadAccessToken: vi.fn() })),
}));

// Import the mocked fetchSheet
import { fetchSheet } from './google-sheets';
const mockFetchSheet = vi.mocked(fetchSheet);

describe('Setup Function Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console.log mock
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('URL Validation', () => {
    it('extracts document ID from valid Google Sheets URL', async () => {
      // Mock successful sheet validation
      mockFetchSheet.mockResolvedValue({
        values: [['Email Address']],
      });

      const result = await setup(mockEnv, validSetupOptions);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual(['Email Address', 'Email Address']);
      }
    });

    it('rejects invalid URLs', async () => {
      const result = await setup(mockEnv, invalidUrlOptions);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe(setupFailureReasons.invalidUrl);
      }
      expect(mockFetchSheet).not.toHaveBeenCalled();
    });

    it('rejects missing sheet URL', async () => {
      const result = await setup(mockEnv, missingUrlOptions);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe(setupFailureReasons.invalidUrl);
      }
      expect(mockFetchSheet).not.toHaveBeenCalled();
    });

    it('handles various Google Sheets URL formats', async () => {
      mockFetchSheet.mockResolvedValue({
        values: [['Email Address']],
      });

      const urlVariations = [
        'https://docs.google.com/spreadsheets/d/1ABC123/edit',
        'https://docs.google.com/spreadsheets/d/1ABC123/edit#gid=0',
        'https://docs.google.com/spreadsheets/d/1ABC123/edit?usp=sharing',
      ];

      for (const url of urlVariations) {
        const options = [
          { ...validSetupOptions[0], value: url },
          ...validSetupOptions.slice(1),
        ];

        const result = await setup(mockEnv, options);
        expect(result.ok).toBe(true);
      }
    });
  });

  describe('Sheet Structure Validation', () => {
    it('validates correct sheet structure', async () => {
      mockFetchSheet.mockResolvedValue({
        values: [['Email Address']],
      });

      const result = await setup(mockEnv, validSetupOptions);

      expect(result.ok).toBe(true);
      expect(mockFetchSheet).toHaveBeenCalledTimes(2);
      expect(mockFetchSheet).toHaveBeenCalledWith('1ABC123DEF456', 'Vetted Members!D1');
      expect(mockFetchSheet).toHaveBeenCalledWith('1ABC123DEF456', 'Private Members!D1');
    });

    it('rejects sheets with wrong column headers', async () => {
      mockFetchSheet.mockResolvedValue({
        values: [['Wrong Column']],
      });

      const result = await setup(mockEnv, validSetupOptions);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe(setupFailureReasons.wrongHeadings);
      }
    });

    it('rejects sheets where only one has correct headers', async () => {
      mockFetchSheet
        .mockResolvedValueOnce({ values: [['Email Address']] })
        .mockResolvedValueOnce({ values: [['Wrong Column']] });

      const result = await setup(mockEnv, validSetupOptions);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe(setupFailureReasons.wrongHeadings);
      }
    });

    it('handles empty sheet responses', async () => {
      mockFetchSheet.mockResolvedValue({
        values: [],
      });

      const result = await setup(mockEnv, validSetupOptions);

      // Empty values array results in empty columnHeadings array
      // which means every() returns true for empty array
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual([]);
      }
    });

    it('handles missing values in sheet response', async () => {
      mockFetchSheet.mockResolvedValue({});

      const result = await setup(mockEnv, validSetupOptions);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe(setupFailureReasons.errorFetching);
      }
    });
  });

  describe('KV Storage Operations', () => {
    it('stores configuration in KV store', async () => {
      mockFetchSheet.mockResolvedValue({
        values: [['Email Address']],
      });

      const kvSpy = vi.spyOn(mockEnv.hmu_bot, 'put');

      await setup(mockEnv, validSetupOptions);

      expect(kvSpy).toHaveBeenCalledWith('sheet', '1ABC123DEF456');
      expect(kvSpy).toHaveBeenCalledWith('vetted', 'vetted-role-id-123');
      expect(kvSpy).toHaveBeenCalledWith('private', 'private-role-id-456');
    });

    it('stores configuration even if sheet validation fails', async () => {
      mockFetchSheet.mockResolvedValue({
        values: [['Wrong Column']],
      });

      const kvSpy = vi.spyOn(mockEnv.hmu_bot, 'put');

      await setup(mockEnv, validSetupOptions);

      // KV operations should still happen before sheet validation
      expect(kvSpy).toHaveBeenCalledWith('sheet', '1ABC123DEF456');
      expect(kvSpy).toHaveBeenCalledWith('vetted', 'vetted-role-id-123');
      expect(kvSpy).toHaveBeenCalledWith('private', 'private-role-id-456');
    });
  });

  describe('Error Handling', () => {
    it('handles network errors when fetching sheets', async () => {
      mockFetchSheet.mockRejectedValue(new Error('Network error'));

      const result = await setup(mockEnv, validSetupOptions);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe(setupFailureReasons.errorFetching);
      }
    });

    it('handles Google Sheets API errors', async () => {
      mockFetchSheet.mockRejectedValue(new Error('Permission denied'));

      const result = await setup(mockEnv, validSetupOptions);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe(setupFailureReasons.errorFetching);
      }
    });

    it('logs errors when sheet fetching fails', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const error = new Error('Test error');
      mockFetchSheet.mockRejectedValue(error);

      await setup(mockEnv, validSetupOptions);

      expect(consoleSpy).toHaveBeenCalledWith('[ERR]', error);
    });
  });

  describe('Edge Cases', () => {
    it('handles options with missing role values', async () => {
      mockFetchSheet.mockResolvedValue({
        values: [['Email Address']],
      });

      // Set up spy before the function call
      const kvSpy = vi.spyOn(mockEnv.hmu_bot, 'put');

      const optionsWithMissingRoles = [
        validSetupOptions[0], // sheet-url
        { name: 'vetted-role' as const, type: 8, value: undefined as any },
        { name: 'private-role' as const, type: 8, value: '' },
      ];

      const result = await setup(mockEnv, optionsWithMissingRoles);

      expect(result.ok).toBe(true);

      // Should store empty strings for missing role values
      expect(kvSpy).toHaveBeenCalledWith('vetted', '');
      expect(kvSpy).toHaveBeenCalledWith('private', '');
    });

    it('handles malformed sheet responses', async () => {
      mockFetchSheet.mockResolvedValue({
        values: [
          [], // Empty row
          [null], // Null value
          ['Email Address', 'Extra Column'], // Multiple columns
        ],
      });

      const result = await setup(mockEnv, validSetupOptions);

      // flatMap flattens: [null, 'Email Address', 'Extra Column']
      // every() fails because null !== 'Email Address'
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe(setupFailureReasons.wrongHeadings);
      }
    });
  });
});