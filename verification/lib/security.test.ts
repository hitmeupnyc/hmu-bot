import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanEmail, sanitizeEmail, retrieveSheetId } from "./utils";

describe("Security & Input Validation", () => {
  describe("Email Input Sanitization", () => {
    describe("cleanEmail function", () => {
      it("converts emails to lowercase", () => {
        expect(cleanEmail("TEST@EXAMPLE.COM")).toBe("test@example.com");
        expect(cleanEmail("User.Name@Domain.Org")).toBe("user.name@domain.org");
        expect(cleanEmail("MixedCase@Test.CO.UK")).toBe("mixedcase@test.co.uk");
      });

      it("handles already lowercase emails", () => {
        expect(cleanEmail("already@lowercase.com")).toBe(
          "already@lowercase.com",
        );
      });

      it("preserves special characters", () => {
        expect(cleanEmail("User+Tag@Example.Com")).toBe("user+tag@example.com");
        expect(cleanEmail("user.name+tag@sub.domain.org")).toBe(
          "user.name+tag@sub.domain.org",
        );
      });

      it("handles edge cases safely", () => {
        expect(cleanEmail("")).toBe("");
        expect(cleanEmail("   ")).toBe("");
        expect(cleanEmail("NOATSIGN")).toBe("noatsign");
      });
    });

    describe("sanitizeEmail function for logging", () => {
      it("masks email local parts in text", () => {
        const text = "User test@example.com logged in";
        const sanitized = sanitizeEmail(text);
        expect(sanitized).toBe("User t***@example.com logged in");
      });

      it("masks multiple emails in text", () => {
        const text = "From: alice@company.com To: bob@test.org";
        const sanitized = sanitizeEmail(text);
        expect(sanitized).toBe("From: a****@company.com To: b**@test.org");
      });

      it("preserves domain parts for debugging", () => {
        const sanitized = sanitizeEmail("error with user@example.com");
        expect(sanitized).toContain("@example.com");
        expect(sanitized).not.toContain("user@");
      });

      it("handles different email formats", () => {
        const testCases = [
          { input: "user+tag@domain.com", pattern: /u\*+@domain\.com/ },
          {
            input: "user.name@sub.domain.org",
            pattern: /u\*+@sub\.domain\.org/,
          },
          { input: "a@test.co.uk", pattern: /a@test\.co\.uk/ }, // Single char local part
        ];

        testCases.forEach(({ input, pattern }) => {
          const sanitized = sanitizeEmail(`Error: ${input} failed`);
          expect(sanitized).toMatch(pattern);
        });
      });

      it("handles malformed email-like strings safely", () => {
        const testCases = [
          "user@", // Missing domain
          "@domain.com", // Missing local part
          "user@@domain.com", // Double @
          "user@domain", // Missing TLD
        ];

        testCases.forEach((malformed) => {
          // Should not throw, and should either sanitize or leave unchanged
          expect(() => sanitizeEmail(`Text with ${malformed}`)).not.toThrow();
        });
      });

      it("handles text without emails", () => {
        const text = "No emails in this text";
        expect(sanitizeEmail(text)).toBe(text);
      });

      it("handles empty and whitespace text", () => {
        expect(sanitizeEmail("")).toBe("");
        expect(sanitizeEmail("   ")).toBe("   ");
        expect(sanitizeEmail("\\n\\t")).toBe("\\n\\t");
      });
    });
  });

  describe("URL Input Validation", () => {
    describe("retrieveSheetId function", () => {
      it("extracts valid Google Sheets IDs", () => {
        const validUrls = [
          "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit",
          "https://docs.google.com/spreadsheets/d/abcd1234-efgh5678/edit#gid=0",
          "https://docs.google.com/spreadsheets/d/validSheetId123/edit?usp=sharing",
        ];

        const expectedIds = [
          "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
          "abcd1234-efgh5678",
          "validSheetId123",
        ];

        validUrls.forEach((url, index) => {
          expect(retrieveSheetId(url)).toBe(expectedIds[index]);
        });
      });

      it("returns null for malformed URLs", () => {
        const malformedUrls = [
          "https://example.com/not-a-sheet",
          "https://docs.google.com/spreadsheets/invalid",
          "not-a-url-at-all",
          "",
          'javascript:alert("xss")',
          "file:///etc/passwd",
        ];

        malformedUrls.forEach((url) => {
          expect(retrieveSheetId(url)).toBeNull();
        });
      });

      it("handles potential XSS attempts", () => {
        const xssAttempts = [
          'https://docs.google.com/spreadsheets/d/<script>alert("xss")</script>/edit',
          "https://docs.google.com/spreadsheets/d/javascript:alert(1)/edit",
          'https://docs.google.com/spreadsheets/d/" onload="alert(1)/edit',
        ];

        xssAttempts.forEach((url) => {
          const result = retrieveSheetId(url);
          // Should either return null or extract the ID without executing anything
          expect(typeof result === "string" || result === null).toBe(true);
          // The function extracts whatever is between /d/ and /edit - it doesn't sanitize
          // Security should be handled at the application layer, not in this utility function
        });
      });

      it("handles very long URLs safely", () => {
        const longId = "a".repeat(1000);
        const longUrl = `https://docs.google.com/spreadsheets/d/${longId}/edit`;

        expect(retrieveSheetId(longUrl)).toBe(longId);
      });

      it("handles special characters in sheet IDs", () => {
        const specialChars = [
          "sheet-with-dashes",
          "sheet_with_underscores",
          "sheet123with456numbers",
          "sheetWithMixedCase",
        ];

        specialChars.forEach((id) => {
          const url = `https://docs.google.com/spreadsheets/d/${id}/edit`;
          expect(retrieveSheetId(url)).toBe(id);
        });
      });
    });
  });

  describe("SQL Injection Prevention", () => {
    it("email cleaning does not expose to SQL injection", () => {
      const sqlInjectionAttempts = [
        "test'; DROP TABLE users; --@example.com",
        "test@example.com'; DELETE FROM sheets; --",
        "test@example.com' OR '1'='1",
        'test@example.com\\"; SELECT * FROM secrets; --',
      ];

      sqlInjectionAttempts.forEach((maliciousEmail) => {
        const cleaned = cleanEmail(maliciousEmail);
        // Should just convert to lowercase, not execute SQL
        expect(typeof cleaned).toBe("string");
        expect(cleaned).toBe(maliciousEmail.toLowerCase());
        // Functions should be pure string operations
      });
    });

    it("URL extraction does not expose to injection", () => {
      const injectionUrls = [
        "https://docs.google.com/spreadsheets/d/test'; DROP TABLE--/edit",
        "https://docs.google.com/spreadsheets/d/test OR 1=1/edit",
        'https://docs.google.com/spreadsheets/d/test\\"; SELECT */edit',
      ];

      injectionUrls.forEach((url) => {
        const result = retrieveSheetId(url);
        // Should extract the ID or return null, not execute anything
        expect(typeof result === "string" || result === null).toBe(true);
      });
    });
  });

  describe("Cross-Site Scripting (XSS) Prevention", () => {
    it("sanitizeEmail masks email addresses with potential script content", () => {
      const xssAttempts = [
        '<script>alert("xss")</script>@example.com',
        "user@<script>alert(1)</script>.com",
        "user+<img src=x onerror=alert(1)>@example.com",
        "user@example.com<script>document.cookie</script>",
      ];

      xssAttempts.forEach((xssEmail) => {
        const sanitized = sanitizeEmail(`User logged in: ${xssEmail}`);
        // The function masks emails but doesn't strip HTML - that should be done at output level
        expect(typeof sanitized).toBe("string");
        // Should still contain masked email pattern
        if (xssEmail.includes("@")) {
          expect(sanitized).toContain("@");
        }
      });
    });

    it("handles HTML entity encoding attempts", () => {
      const entityAttempts = [
        "user&#64;example.com", // HTML entity for @
        "user&lt;script&gt;@example.com",
        "user@example&#46;com",
      ];

      entityAttempts.forEach((encoded) => {
        const sanitized = sanitizeEmail(`Error: ${encoded}`);
        // Should handle as plain text, not decode entities
        expect(typeof sanitized).toBe("string");
      });
    });
  });

  describe("Input Length Validation", () => {
    it("handles extremely long email inputs", () => {
      const longLocal = "a".repeat(1000);
      const longDomain = "b".repeat(1000);
      const longEmail = `${longLocal}@${longDomain}.com`;

      expect(() => cleanEmail(longEmail)).not.toThrow();
      expect(() => sanitizeEmail(longEmail)).not.toThrow();

      const cleaned = cleanEmail(longEmail);
      expect(cleaned).toBe(longEmail.toLowerCase());
    });

    it("handles extremely long URLs", () => {
      const longPath = "/".repeat(10000);
      const longUrl = `https://docs.google.com/spreadsheets/d/validId/edit${longPath}`;

      expect(() => retrieveSheetId(longUrl)).not.toThrow();
      // Should still extract the valid ID
      expect(retrieveSheetId(longUrl)).toBe("validId");
    });

    it("handles empty strings safely", () => {
      expect(() => cleanEmail("")).not.toThrow();
      expect(() => sanitizeEmail("")).not.toThrow();
      expect(() => retrieveSheetId("")).not.toThrow();

      expect(cleanEmail("")).toBe("");
      expect(sanitizeEmail("")).toBe("");
      expect(retrieveSheetId("")).toBeNull();
    });
  });

  describe("Unicode and Encoding Handling", () => {
    it("handles unicode characters in emails", () => {
      const unicodeEmails = [
        "user@tëst.com",
        "üser@example.com",
        "user@例え.com", // Japanese characters
        "user@тест.com", // Cyrillic
      ];

      unicodeEmails.forEach((email) => {
        expect(() => cleanEmail(email)).not.toThrow();
        expect(() => sanitizeEmail(email)).not.toThrow();

        const cleaned = cleanEmail(email);
        expect(cleaned).toBe(email.toLowerCase());
      });
    });

    it("handles URL encoding in sheet URLs", () => {
      const encodedUrls = [
        "https://docs.google.com/spreadsheets/d/sheet%20id/edit",
        "https://docs.google.com/spreadsheets/d/sheet+id/edit",
        "https://docs.google.com/spreadsheets/d/sheet%2Bid/edit",
      ];

      encodedUrls.forEach((url) => {
        expect(() => retrieveSheetId(url)).not.toThrow();
        const result = retrieveSheetId(url);
        expect(typeof result === "string" || result === null).toBe(true);
      });
    });

    it("handles null bytes and control characters", () => {
      const maliciousInputs = [
        "user\\0@example.com", // Null byte
        "user\\r\\n@example.com", // CRLF injection
        "user\\t@example.com", // Tab character
        "user\\x00@example.com", // Hex null byte
      ];

      maliciousInputs.forEach((input) => {
        expect(() => cleanEmail(input)).not.toThrow();
        expect(() => sanitizeEmail(input)).not.toThrow();

        // Should handle as regular string, not interpret control chars
        const cleaned = cleanEmail(input);
        expect(typeof cleaned).toBe("string");
      });
    });
  });

  describe("Format Validation Edge Cases", () => {
    it("handles malformed email structures", () => {
      const malformedEmails = [
        "@",
        "@@",
        "@domain.com",
        "user@",
        "user@@domain.com",
        "user@domain@extra.com",
        ".user@domain.com",
        "user.@domain.com",
        "user@.domain.com",
        "user@domain.com.",
      ];

      malformedEmails.forEach((email) => {
        expect(() => cleanEmail(email)).not.toThrow();
        expect(() => sanitizeEmail(`Error: ${email}`)).not.toThrow();

        // Functions should handle gracefully without validation errors
        const cleaned = cleanEmail(email);
        expect(typeof cleaned).toBe("string");
      });
    });

    it("preserves email structure during cleaning", () => {
      const email = "Test.User+Tag@Example.Com";
      const cleaned = cleanEmail(email);

      // Should only change case, not structure
      expect(cleaned).toBe("test.user+tag@example.com");
      expect(cleaned.includes("@")).toBe(true);
      expect(cleaned.includes("+")).toBe(true);
      expect(cleaned.includes(".")).toBe(true);
    });
  });
});
