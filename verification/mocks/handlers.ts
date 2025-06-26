import { http, HttpResponse } from 'msw';

// Google OAuth handlers for service account authentication
export const googleOAuthHandlers = [
  http.post('https://oauth2.googleapis.com/token', async ({ request }) => {
    const body = await request.text();
    
    // Check if this is a JWT bearer grant (service account)
    if (body.includes('urn:ietf:params:oauth:grant-type:jwt-bearer')) {
      return HttpResponse.json({
        access_token: 'mock-google-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      });
    }
    
    return HttpResponse.json(
      { error: 'invalid_grant' },
      { status: 400 }
    );
  }),
];

// Google Sheets API handlers
export const googleSheetsHandlers = [
  // Successful sheet data fetch
  http.get('https://sheets.googleapis.com/v4/spreadsheets/:sheetId/values/:range', ({ params, request }) => {
    const { sheetId, range } = params;
    const url = new URL(request.url);
    
    // Default successful response
    const defaultResponse = {
      range: decodeURIComponent(range as string),
      majorDimension: 'ROWS',
      values: [['Email Address']]
    };

    // Handle different sheet IDs for testing scenarios
    switch (sheetId) {
      case 'valid-sheet-123':
        return HttpResponse.json(defaultResponse);
        
      case 'empty-sheet-456':
        return HttpResponse.json({
          ...defaultResponse,
          values: []
        });
        
      case 'wrong-headers-789':
        return HttpResponse.json({
          ...defaultResponse,
          values: [['Wrong Column']]
        });
        
      case 'malformed-data-abc':
        return HttpResponse.json({
          ...defaultResponse,
          values: [
            [], // Empty row
            [null], // Null value  
            ['Email Address', 'Extra Column'] // Multiple columns
          ]
        });
        
      case 'permission-denied-def':
        return HttpResponse.json(
          {
            error: {
              code: 403,
              message: 'The caller does not have permission',
              status: 'PERMISSION_DENIED'
            }
          },
          { status: 403 }
        );
        
      case 'network-error-ghi':
        return HttpResponse.error();
        
      default:
        return HttpResponse.json(defaultResponse);
    }
  }),
];

// Discord API handlers
export const discordHandlers = [
  // OAuth token exchange
  http.post('https://discord.com/api/oauth2/token', async ({ request }) => {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const code = params.get('code');
    
    switch (code) {
      case 'valid-oauth-code':
        return HttpResponse.json({
          access_token: 'mock-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token'
        });
        
      case 'invalid-oauth-code':
        return HttpResponse.json(
          { error: 'invalid_grant', error_description: 'Invalid authorization code' },
          { status: 400 }
        );
        
      default:
        return HttpResponse.error();
    }
  }),

  // User info endpoint
  http.get('https://discord.com/api/users/@me', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    
    if (authHeader === 'Bearer mock-access-token') {
      return HttpResponse.json({
        id: '123456789',
        username: 'testuser',
        email: 'test@example.com',
        verified: true
      });
    }
    
    if (authHeader === 'Bearer unverified-token') {
      return HttpResponse.json({
        id: '987654321',
        username: 'unverifieduser', 
        email: 'unverified@example.com',
        verified: false
      });
    }
    
    return HttpResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    );
  }),

  // Role assignment
  http.put('https://discord.com/api/guilds/:guildId/members/:userId/roles/:roleId', ({ params, request }) => {
    const authHeader = request.headers.get('Authorization');
    const { guildId, userId, roleId } = params;
    
    // Simulate different scenarios based on IDs
    if (userId === 'banned-user-id') {
      return HttpResponse.json(
        { message: 'User is banned from this guild' },
        { status: 403 }
      );
    }
    
    if (roleId === 'nonexistent-role') {
      return HttpResponse.json(
        { message: 'Unknown Role' },
        { status: 404 }
      );
    }
    
    if (!authHeader?.startsWith('Bot ')) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Successful role assignment returns 204 No Content
    return new HttpResponse(null, { status: 204 });
  }),
];

// Mailjet API handlers
export const mailjetHandlers = [
  http.post('https://api.mailjet.com/v3.1/send', async ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader?.startsWith('Basic ')) {
      return HttpResponse.json(
        { ErrorMessage: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json() as any;
    const message = body.Messages?.[0];
    
    if (!message?.To?.[0]?.Email) {
      return HttpResponse.json(
        { ErrorMessage: 'Invalid recipient' },
        { status: 400 }
      );
    }
    
    const email = message.To[0].Email;
    
    // Simulate rate limiting for specific email
    if (email === 'ratelimited@example.com') {
      return HttpResponse.json(
        { ErrorMessage: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
    
    // Simulate invalid email
    if (email === 'invalid@invalid') {
      return HttpResponse.json(
        { ErrorMessage: 'Invalid email address' },
        { status: 400 }
      );
    }
    
    // Successful send
    return HttpResponse.json({
      Messages: [{
        Status: 'success',
        CustomID: '',
        To: [{ Email: email, MessageUUID: 'mock-uuid' }],
        Cc: [],
        Bcc: []
      }]
    });
  }),
];

// Combine all handlers
export const handlers = [
  ...googleOAuthHandlers,
  ...googleSheetsHandlers,
  ...discordHandlers,
  ...mailjetHandlers,
];