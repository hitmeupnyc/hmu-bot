import { describe, it, expect } from "vitest";
import {
  retrieveSheetId,
  cleanEmail,
  sanitizeEmail,
  getEmailListFromSheetValues,
} from "./utils";

describe("Utility Functions", () => {
  it("retrieveSheetId extracts ID from valid Google Sheets URL", () => {
    const url =
      "https://docs.google.com/spreadsheets/d/1ABC123DEF456/edit#gid=0";
    const result = retrieveSheetId(url);
    expect(result).toBe("1ABC123DEF456");
  });

  it("retrieveSheetId returns null for invalid URL", () => {
    const url = "https://example.com/not-a-sheet";
    const result = retrieveSheetId(url);
    expect(result).toBeNull();
  });

  it("cleanEmail normalizes email to lowercase", () => {
    const email = "TEST@EXAMPLE.COM";
    const result = cleanEmail(email);
    expect(result).toBe("test@example.com");
  });

  it("cleanEmail handles already lowercase email", () => {
    const email = "user@domain.org";
    const result = cleanEmail(email);
    expect(result).toBe("user@domain.org");
  });

  it("sanitizeEmail masks email addresses in text", () => {
    const text = "User test@example.com has verified their account";
    const result = sanitizeEmail(text);
    expect(result).toBe("User t***@example.com has verified their account");
  });

  it("sanitizeEmail handles multiple emails in same text", () => {
    const text = "Both user@test.com and admin@example.org are verified";
    const result = sanitizeEmail(text);
    expect(result).toBe(
      "Both u***@test.com and a****@example.org are verified",
    );
  });

  it("sanitizeEmail handles single character local part", () => {
    const text = "User a@example.com logged in";
    const result = sanitizeEmail(text);
    expect(result).toBe("User a@example.com logged in");
  });

  it("getEmailListFromSheetValues flattens and filters sheet data", () => {
    const sheetValues = [
      ["user1@example.com"],
      ["user2@test.org", "user3@domain.net"],
      [""],
      [null],
      ["user4@valid.com"],
    ];
    const result = getEmailListFromSheetValues(sheetValues);
    expect(result).toEqual([
      "user1@example.com",
      "user2@test.org",
      "user3@domain.net",
      "user4@valid.com",
    ]);
  });

  it("getEmailListFromSheetValues handles empty array", () => {
    const sheetValues: any[] = [];
    const result = getEmailListFromSheetValues(sheetValues);
    expect(result).toEqual([]);
  });
});
