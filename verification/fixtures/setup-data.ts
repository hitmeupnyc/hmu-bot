import type { KVNamespace } from "@cloudflare/workers-types";

// Mock KV Store implementation
export class MockKVStore implements KVNamespace {
  private store = new Map<string, { value: string; expiration?: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;

    if (item.expiration && Date.now() > item.expiration) {
      this.store.delete(key);
      return null;
    }

    return item.value;
  }

  async put(
    key: string,
    value: string,
    options?: { expirationTtl?: number }
  ): Promise<void> {
    const expiration = options?.expirationTtl
      ? Date.now() + options.expirationTtl * 1000
      : undefined;

    this.store.set(key, { value, expiration });
  }

  // Implement other KVNamespace methods as no-ops for testing
  async delete(): Promise<void> {}
  async list(): Promise<any> {
    return { keys: [], list_complete: true };
  }
  getWithMetadata(): Promise<any> {
    throw new Error("Not implemented in mock");
  }
}

// Test environment
export const mockEnv = {
  DISCORD_APP_ID: "test-app-id",
  DISCORD_GUILD_ID: "test-guild-id", 
  DISCORD_PUBLIC_KEY: "test-public-key",
  DISCORD_TOKEN: "test-token",
  DISCORD_SECRET: "test-secret",
  DISCORD_OAUTH_DESTINATION: "https://test.example.com/oauth",
  GOOGLE_SA_PRIVATE_KEY: "test-private-key",
  MAILJET_PUBLIC: "test-mailjet-public",
  MAILJET_KEY: "test-mailjet-key",
  hmu_bot: new MockKVStore(),
};

// Setup options fixtures
export const validSetupOptions = [
  {
    name: "sheet-url" as const,
    type: 3, // ApplicationCommandOptionType.String
    value: "https://docs.google.com/spreadsheets/d/1ABC123DEF456/edit#gid=0",
  },
  {
    name: "vetted-role" as const,
    type: 8, // ApplicationCommandOptionType.Role
    value: "vetted-role-id-123",
  },
  {
    name: "private-role" as const,
    type: 8, // ApplicationCommandOptionType.Role
    value: "private-role-id-456",
  },
];

export const invalidUrlOptions = [
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

export const missingUrlOptions = [
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

// Google Sheets API response fixtures
export const validSheetResponse = {
  ok: true,
  json: () =>
    Promise.resolve({
      values: [["Email Address"]],
    }),
};

export const invalidSheetResponse = {
  ok: true,
  json: () =>
    Promise.resolve({
      values: [["Wrong Column"]],
    }),
};

export const networkErrorResponse = {
  ok: false,
  status: 500,
  json: () =>
    Promise.resolve({
      error: "Internal Server Error",
    }),
};

export const emptySheetResponse = {
  ok: true,
  json: () =>
    Promise.resolve({
      values: [],
    }),
};