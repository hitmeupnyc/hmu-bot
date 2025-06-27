// Discord API test data and fixtures

export const discordTestData = {
  // OAuth authorization codes
  validOAuthCode: 'valid-oauth-code',
  invalidOAuthCode: 'invalid-oauth-code',
  expiredOAuthCode: 'expired-oauth-code',
  malformedOAuthCode: 'malformed-code-123',
  
  // Access tokens
  validAccessToken: 'mock-access-token',
  expiredAccessToken: 'expired-access-token',
  invalidAccessToken: 'invalid-access-token',
  unverifiedAccessToken: 'unverified-token',
  
  // User data
  verifiedUser: {
    id: '123456789',
    username: 'testuser',
    email: 'test@example.com',
    verified: true
  },
  
  unverifiedUser: {
    id: '987654321',
    username: 'unverifieduser', 
    email: 'unverified@example.com',
    verified: false
  },
  
  userWithoutEmail: {
    id: '555666777',
    username: 'noemailuser',
    email: null,
    verified: true
  },
  
  // Guild and role IDs
  testGuildId: 'test-guild-id',
  testUserId: '123456789',
  vettedRoleId: 'vetted-role-id-123',
  privateRoleId: 'private-role-id-456',
  nonexistentRoleId: 'nonexistent-role',
  bannedUserId: 'banned-user-id',
  
  // OAuth configuration
  testClientId: 'test-client-id',
  testClientSecret: 'test-client-secret',
  testOAuthDestination: 'https://test.example.com/oauth',
  testBotToken: 'test-bot-token',
  
  // Error scenarios
  networkErrorCode: 'network-error-code',
  rateLimitCode: 'rate-limit-code',
  serverErrorCode: 'server-error-code',
};

// OAuth token exchange responses
export const oauthResponses = {
  validTokenResponse: {
    access_token: discordTestData.validAccessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'mock-refresh-token',
    scope: 'identify email'
  },
  
  invalidGrantResponse: {
    error: 'invalid_grant',
    error_description: 'Invalid authorization code'
  },
  
  expiredCodeResponse: {
    error: 'invalid_grant', 
    error_description: 'The authorization code has expired'
  },
  
  rateLimitResponse: {
    error: 'rate_limited',
    error_description: 'Rate limit exceeded',
    retry_after: 5
  }
};

// User identity responses
export const userResponses = {
  verifiedUserResponse: discordTestData.verifiedUser,
  
  unverifiedUserResponse: discordTestData.unverifiedUser,
  
  unauthorizedResponse: {
    message: 'Unauthorized',
    code: 0
  },
  
  rateLimitedResponse: {
    message: 'You are being rate limited.',
    retry_after: 1.5,
    global: false
  }
};

// Role assignment responses
export const roleResponses = {
  successResponse: null, // Discord returns 204 No Content on success
  
  forbiddenResponse: {
    message: 'Missing Permissions',
    code: 50013
  },
  
  unknownRoleResponse: {
    message: 'Unknown Role',
    code: 10011
  },
  
  unknownUserResponse: {
    message: 'Unknown Member',
    code: 10007
  },
  
  bannedUserResponse: {
    message: 'User is banned from this guild',
    code: 40007
  }
};

// Helper function to create test parameters for OAuth flow
export const createOAuthTestParams = (code: string = discordTestData.validOAuthCode) => ({
  code,
  clientId: discordTestData.testClientId,
  clientSecret: discordTestData.testClientSecret,
  oauthDestination: discordTestData.testOAuthDestination
});

// Helper function to create test parameters for role granting
export const createRoleGrantParams = (
  userId: string = discordTestData.testUserId,
  roleId: string = discordTestData.vettedRoleId
) => ({
  token: discordTestData.testBotToken,
  guildId: discordTestData.testGuildId,
  roleId,
  userId
});