import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/setup";
import { setupFailureReasons } from "../index";
import { setupSheet } from "./setup";
import { mockEnv } from "../fixtures/setup-data";

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

describe("Setup Function with MSW", () => {
  beforeEach(() => {
    // Test setup - no console mocking needed
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("URL Validation", () => {
    it("extracts document ID from valid Google Sheets URL", async () => {
      const result = await setupSheet(
        mockEnv,
        createOptions("valid-sheet-123"),
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual(["Email Address", "Email Address"]);
      }
    });

    it("rejects invalid URLs", async () => {
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

      const result = await setupSheet(mockEnv, invalidOptions);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe(setupFailureReasons.invalidUrl);
      }
    });
  });

  describe("Sheet Structure Validation with MSW", () => {
    it("validates correct sheet structure", async () => {
      const result = await setupSheet(
        mockEnv,
        createOptions("valid-sheet-123"),
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual(["Email Address", "Email Address"]);
      }
    });

    it("rejects sheets with wrong column headers", async () => {
      const result = await setupSheet(
        mockEnv,
        createOptions("wrong-headers-789"),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe(setupFailureReasons.wrongHeadings);
      }
    });

    it("handles empty sheet responses", async () => {
      const result = await setupSheet(
        mockEnv,
        createOptions("empty-sheet-456"),
      );

      // Empty values array results in empty columnHeadings array
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual([]);
      }
    });

    it("handles malformed sheet responses", async () => {
      const result = await setupSheet(
        mockEnv,
        createOptions("malformed-data-abc"),
      );

      // flatMap flattens: [null, 'Email Address', 'Extra Column']
      // every() fails because null !== 'Email Address'
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe(setupFailureReasons.wrongHeadings);
      }
    });
  });

  describe("Error Handling with MSW", () => {
    it("handles Google Sheets API permission errors", async () => {
      // Use fake timers to speed up retry delays
      vi.useFakeTimers();

      const setupPromise = setupSheet(
        mockEnv,
        createOptions("permission-denied-def"),
      );

      // Fast-forward through all retry delays (1s + 2s + 4s = 7s total)
      await vi.advanceTimersByTimeAsync(8000);

      const result = await setupPromise;

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe(setupFailureReasons.errorFetching);
      }

      vi.useRealTimers();
    });

    it("handles network errors", async () => {
      vi.useFakeTimers();

      const setupPromise = setupSheet(
        mockEnv,
        createOptions("network-error-ghi"),
      );

      // Fast-forward through retry delays
      await vi.advanceTimersByTimeAsync(8000);

      const result = await setupPromise;

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe(setupFailureReasons.errorFetching);
      }

      vi.useRealTimers();
    });

    it("handles retries with exponential backoff for network errors", async () => {
      vi.useFakeTimers();
      let requestCount = 0;

      // Track the number of requests made during retries
      server.use(
        http.get(
          "https://sheets.googleapis.com/v4/spreadsheets/retry-test-789/values/*",
          () => {
            requestCount++;
            return HttpResponse.error();
          },
        ),
      );

      const setupPromise = setupSheet(
        mockEnv,
        createOptions("retry-test-789"),
      );

      // Fast-forward through retry delays
      await vi.advanceTimersByTimeAsync(8000);

      const result = await setupPromise;

      // Verify the function attempted retries (should be 8 total attempts: 2 fetchSheet calls × 4 attempts each)
      expect(requestCount).toBe(8);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe(setupFailureReasons.errorFetching);
      }

      vi.useRealTimers();
    });
  });

  describe("Dynamic Handler Testing", () => {
    it("can override handlers for specific test scenarios", async () => {
      // Handler defined in mocks/handlers.ts for 'custom-test-123'
      const result = await setupSheet(
        mockEnv,
        createOptions("custom-test-123"),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe(setupFailureReasons.wrongHeadings);
      }
    });

    it("can simulate server timeouts", async () => {
      vi.useFakeTimers();

      // Handler defined in mocks/handlers.ts for 'timeout-test-456'
      const setupPromise = setupSheet(
        mockEnv,
        createOptions("timeout-test-456"),
      );

      // Fast-forward through the handler delay (100ms) + retry delays (7s)
      await vi.advanceTimersByTimeAsync(8000);

      const result = await setupPromise;

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe(setupFailureReasons.errorFetching);
      }

      vi.useRealTimers();
    });
  });

  describe("Request Validation", () => {
    it("verifies correct API requests are made", async () => {
      let requestCount = 0;
      const requestUrls: string[] = [];

      // Use dynamic override for request capturing (this is a valid use case for server.use)
      server.use(
        http.get(
          "https://sheets.googleapis.com/v4/spreadsheets/request-test-789/values/*",
          ({ request }) => {
            requestCount++;
            requestUrls.push(request.url);

            return HttpResponse.json({
              values: [["Email Address"]],
            });
          },
        ),
      );

      await setupSheet(mockEnv, createOptions("request-test-789"));

      expect(requestCount).toBe(2); // Two requests for vetted and private sheets
      expect(requestUrls).toHaveLength(2);
      expect(requestUrls[0]).toContain("Vetted%20Members!D1");
      expect(requestUrls[1]).toContain("Private%20Members!D1");
    });
  });
});
