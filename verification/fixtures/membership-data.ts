import { MockKVStore } from './setup-data';

// Mock environment with KV store pre-configured for membership tests
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
  hmu_bot: (() => {
    const kv = new MockKVStore();
    // Pre-configure with sheet ID for membership tests
    kv.put('sheet', 'membership-test-sheet');
    return kv;
  })(),
};

// Test data for different membership scenarios
export const membershipTestData = {
  // Sheet IDs for different test scenarios
  vettedOnlySheet: 'vetted-only-members',
  privateOnlySheet: 'private-only-members', 
  bothListsSheet: 'both-lists-members',
  emptySheet: 'empty-members',
  mixedCaseSheet: 'mixed-case-members',
  malformedSheet: 'malformed-members',
  missingValuesSheet: 'missing-values-members',
  networkErrorSheet: 'network-error-members',
  
  // Test email addresses
  vettedEmails: [
    'vetted1@example.com',
    'vetted2@test.org', 
    'alice@company.com'
  ],
  
  privateEmails: [
    'private1@example.com',
    'private2@secret.org',
    'bob@private.com'
  ],
  
  bothListsEmails: [
    'both@example.com',
    'shared@test.com'
  ],
  
  mixedCaseEmails: [
    'UPPERCASE@EXAMPLE.COM',
    'lowercase@example.com', 
    'MixedCase@Example.Com',
    'camelCase@gmail.com'
  ],
  
  emailsWithTags: [
    // These should match cleaned versions
    'test+tag@gmail.com', // Should match 'test@gmail.com'
    'user+newsletter@company.co.uk' // Should match 'user@company.co.uk'
  ],
  
  notFoundEmails: [
    'notfound@example.com',
    'missing@test.org',
    'unknown@nowhere.com'
  ]
};

// Helper function to create test context with specific sheet ID
export const createMockContextWithSheet = (sheetId: string) => ({
  env: {
    ...mockEnv,
    hmu_bot: (() => {
      const kv = new MockKVStore();
      kv.put('sheet', sheetId);
      return kv;
    })(),
  }
});

// Helper function to create test context without sheet ID
export const createMockContextWithoutSheet = () => ({
  env: {
    ...mockEnv,
    hmu_bot: (() => {
      const kv = new MockKVStore();
      // Don't set sheet ID - should cause error
      return kv;
    })(),
  }
});