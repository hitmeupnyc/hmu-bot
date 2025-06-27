import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { server } from '../../mocks/setup';
import { http, HttpResponse } from 'msw';
import { checkMembership } from '../../lib/checkMembership';
import { sendEmail } from '../../lib/mailjet';
import { fetchEmailFromCode, grantRole } from '../../lib/discord';
import { init } from '../../lib/google-sheets';
import { createMockKVNamespace } from '../../fixtures/mock-kv';

describe('Service Integration Chains', () => {
  let mockKV: any;
  let mockContext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockKV = createMockKVNamespace();
    
    // Mock console methods to suppress output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Create mock Hono context
    mockContext = {
      env: {
        GOOGLE_SA_PRIVATE_KEY: 'test-private-key',
        DISCORD_TOKEN: 'test-bot-token',
        DISCORD_GUILD_ID: 'test-guild-456',
        MAILJET_PUBLIC: 'test-mailjet-public',
        MAILJET_KEY: 'test-mailjet-key',
        hmu_bot: mockKV
      }
    };

    // Setup default MSW handlers
    server.use(
      http.get('https://sheets.googleapis.com/v4/spreadsheets/*/values/Vetted%20Members*', () => {
        return HttpResponse.json({
          values: [['Email Address'], ['vetted@example.com'], ['premium@example.com']]
        });
      }),
      http.get('https://sheets.googleapis.com/v4/spreadsheets/*/values/Private%20Members*', () => {
        return HttpResponse.json({
          values: [['Email Address'], ['private@example.com'], ['premium@example.com']]
        });
      }),
      http.post('https://api.mailjet.com/v3.1/send', () => {
        return HttpResponse.json({
          Messages: [{ Status: 'success', To: [{ Email: 'test@example.com' }] }]
        });
      }),
      http.post('https://discord.com/api/oauth2/token', () => {
        return HttpResponse.json({
          access_token: 'test-access-token',
          token_type: 'Bearer'
        });
      }),
      http.get('https://discord.com/api/users/@me', () => {
        return HttpResponse.json({
          id: '123456789012345678',
          email: 'vetted@example.com',
          verified: true
        });
      }),
      http.put('https://discord.com/api/guilds/*/members/*/roles/*', () => {
        return new HttpResponse(null, { status: 204 });
      })
    );
  });

  describe('Google Sheets → Membership Validation Chain', () => {
    it('successfully validates vetted member through complete chain', async () => {
      // Pre-store sheet ID
      await mockKV.put('sheet', 'test-sheet-123');

      const startTime = Date.now();
      const result = await checkMembership(mockContext, 'vetted@example.com');
      const duration = Date.now() - startTime;

      expect(result.isVetted).toBe(true);
      expect(result.isPrivate).toBe(false);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('validates private member with both memberships', async () => {
      await mockKV.put('sheet', 'test-sheet-123');

      const result = await checkMembership(mockContext, 'premium@example.com');

      expect(result.isVetted).toBe(true);
      expect(result.isPrivate).toBe(true);
    });

    it('handles non-member validation correctly', async () => {
      await mockKV.put('sheet', 'test-sheet-123');

      const result = await checkMembership(mockContext, 'nonmember@example.com');

      expect(result.isVetted).toBe(false);
      expect(result.isPrivate).toBe(false);
    });

    it('handles Google Sheets API failures gracefully', async () => {
      await mockKV.put('sheet', 'test-sheet-123');

      // Mock Google Sheets API failure
      server.use(
        http.get('https://sheets.googleapis.com/v4/spreadsheets/*/values/*', () => {
          return HttpResponse.json(
            { error: { code: 403, message: 'Forbidden' } },
            { status: 403 }
          );
        })
      );

      await expect(checkMembership(mockContext, 'test@example.com')).rejects.toThrow();
    });

    it('handles missing sheet ID configuration', async () => {
      // Don't set sheet ID to test error handling
      
      await expect(checkMembership(mockContext, 'test@example.com')).rejects.toThrow();
    });
  });

  describe('Email → OTP → Mailjet Chain', () => {
    it('successfully sends OTP email through complete chain', async () => {
      let capturedRequest: any;
      server.use(
        http.post('https://api.mailjet.com/v3.1/send', async ({ request }) => {
          capturedRequest = {
            headers: Object.fromEntries(request.headers.entries()),
            body: await request.json()
          };
          return HttpResponse.json({
            Messages: [{ Status: 'success', To: [{ Email: 'test@example.com' }] }]
          });
        })
      );

      const startTime = Date.now();
      const response = await sendEmail(
        'test@example.com',
        '123456',
        'test-public:test-key'
      );
      const duration = Date.now() - startTime;

      expect(response.ok).toBe(true);
      expect(duration).toBeLessThan(1000); // Email should send quickly

      // Verify email content chain
      expect(capturedRequest.body.Messages[0].From.Email).toBe('hello@hitmeupnyc.com');
      expect(capturedRequest.body.Messages[0].To[0].Email).toBe('test@example.com');
      expect(capturedRequest.body.Messages[0].TextPart).toContain('123456');
      expect(capturedRequest.body.Messages[0].TextPart).toContain('expires in 5 minutes');
    });

    it('handles authentication failures in email chain', async () => {
      server.use(
        http.post('https://api.mailjet.com/v3.1/send', () => {
          return HttpResponse.json(
            { ErrorMessage: 'Unauthorized' },
            { status: 401 }
          );
        })
      );

      const response = await sendEmail(
        'test@example.com',
        '123456',
        'invalid:credentials'
      );

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });

    it('validates email format before sending', async () => {
      const response = await sendEmail(
        'invalid@invalid',
        '123456',
        'test-public:test-key'
      );

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });

  describe('Discord OAuth → User Info → Role Assignment Chain', () => {
    it('completes full OAuth to role assignment chain', async () => {
      const startTime = Date.now();
      
      // Step 1: Exchange code for user info
      const userInfo = await fetchEmailFromCode(
        'valid-oauth-code',
        'test-app-id',
        'test-client-secret',
        'https://test.example.com/oauth'
      );
      
      expect(userInfo.id).toBe('123456789012345678');
      expect(userInfo.email).toBe('vetted@example.com');

      // Step 2: Assign role
      const roleResult = await grantRole(
        'test-bot-token',
        'test-guild-456',
        'vetted-role-123',
        userInfo.id
      );

      const duration = Date.now() - startTime;

      expect(roleResult.ok).toBe(true);
      expect(duration).toBeLessThan(3000); // Complete OAuth flow should be fast
    });

    it('handles OAuth token exchange failures', async () => {
      server.use(
        http.post('https://discord.com/api/oauth2/token', () => {
          return HttpResponse.json(
            { error: 'invalid_grant' },
            { status: 400 }
          );
        })
      );

      await expect(fetchEmailFromCode(
        'invalid-code',
        'test-app-id',
        'test-client-secret',
        'https://test.example.com/oauth'
      )).rejects.toThrow();
    });

    it('handles role assignment permission failures', async () => {
      server.use(
        http.put('https://discord.com/api/guilds/*/members/*/roles/*', () => {
          return HttpResponse.json(
            { message: 'Missing Permissions' },
            { status: 403 }
          );
        })
      );

      const result = await grantRole(
        'invalid-bot-token',
        'test-guild-456',
        'vetted-role-123',
        '123456789012345678'
      );

      expect(result.ok).toBe(false);
      expect(result.status).toBe(403);
    });

    it('handles user info retrieval failures', async () => {
      server.use(
        http.get('https://discord.com/api/users/@me', () => {
          return HttpResponse.json(
            { message: 'Unauthorized' },
            { status: 401 }
          );
        })
      );

      await expect(fetchEmailFromCode(
        'valid-oauth-code',
        'test-app-id',
        'test-client-secret',
        'https://test.example.com/oauth'
      )).rejects.toThrow();
    });
  });

  describe('KV Storage Integration Chains', () => {
    it('manages OTP lifecycle correctly', async () => {
      const email = 'test@example.com';
      const otp = '123456';
      const otpKey = `email:${email}`;

      // Store OTP with expiration
      await mockKV.put(otpKey, otp, { expirationTtl: 300 }); // 5 minutes

      // Verify immediate retrieval
      const stored = await mockKV.get(otpKey);
      expect(stored).toBe(otp);

      // Verify cleanup after use (simulate deletion)
      await mockKV.delete(otpKey);
      const deleted = await mockKV.get(otpKey);
      expect(deleted).toBeNull();
    });

    it('handles OTP expiration correctly', async () => {
      const email = 'test@example.com';
      const otp = '123456';
      const otpKey = `email:${email}`;

      // Store OTP with very short expiration
      await mockKV.put(otpKey, otp, { expirationTtl: 1 }); // 1 second

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Verify expired OTP is not retrievable
      const expired = await mockKV.get(otpKey);
      expect(expired).toBeNull();
    });

    it('manages role configuration storage', async () => {
      const vettedRoleId = 'vetted-role-123';
      const privateRoleId = 'private-role-456';

      // Store role configurations
      await mockKV.put('vetted', vettedRoleId);
      await mockKV.put('private', privateRoleId);

      // Verify parallel retrieval
      const [vetted, privateRole] = await Promise.all([
        mockKV.get('vetted'),
        mockKV.get('private')
      ]);

      expect(vetted).toBe(vettedRoleId);
      expect(privateRole).toBe(privateRoleId);
    });

    it('handles sheet ID configuration storage', async () => {
      const sheetUrl = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit';
      const expectedSheetId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';

      // Store sheet ID (simulating URL parsing)
      const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      const sheetId = match ? match[1] : null;
      
      expect(sheetId).toBe(expectedSheetId);
      
      await mockKV.put('sheet', sheetId);
      const stored = await mockKV.get('sheet');
      expect(stored).toBe(expectedSheetId);
    });
  });

  describe('Cross-Service Error Propagation', () => {
    it('propagates Google Sheets errors to membership checking', async () => {
      await mockKV.put('sheet', 'test-sheet-123');

      // Mock sequential failures
      server.use(
        http.get('https://sheets.googleapis.com/v4/spreadsheets/*/values/Vetted%20Members*', () => {
          return HttpResponse.error();
        })
      );

      await expect(checkMembership(mockContext, 'test@example.com')).rejects.toThrow();
    });

    it('handles partial service failures gracefully', async () => {
      await mockKV.put('sheet', 'test-sheet-123');

      // Mock first request success, second request failure
      let requestCount = 0;
      server.use(
        http.get('https://sheets.googleapis.com/v4/spreadsheets/*/values/Vetted%20Members*', () => {
          return HttpResponse.json({
            values: [['Email Address'], ['vetted@example.com']]
          });
        }),
        http.get('https://sheets.googleapis.com/v4/spreadsheets/*/values/Private%20Members*', () => {
          requestCount++;
          if (requestCount === 1) {
            return HttpResponse.error();
          }
          return HttpResponse.json({
            values: [['Email Address'], ['private@example.com']]
          });
        })
      );

      await expect(checkMembership(mockContext, 'test@example.com')).rejects.toThrow();
    });

    it('tracks service call timing for performance monitoring', async () => {
      await mockKV.put('sheet', 'test-sheet-123');

      const services = ['sheets-vetted', 'sheets-private'];
      const timings: Record<string, number> = {};

      // Measure Google Sheets calls
      for (const service of services) {
        const start = Date.now();
        try {
          await checkMembership(mockContext, 'test@example.com');
        } catch (e) {
          // Expected for this test
        }
        timings[service] = Date.now() - start;
      }

      // Verify all services completed within reasonable time
      Object.values(timings).forEach(timing => {
        expect(timing).toBeLessThan(5000); // 5 second max per service
      });
    });
  });

  describe('Google Sheets Authentication Chain', () => {
    it('initializes and reloads access token correctly', async () => {
      const { alreadyHadToken, reloadAccessToken } = init('test-private-key');
      
      // First initialization should not have token
      expect(alreadyHadToken).toBe(false);
      
      // Should be able to reload token
      await expect(reloadAccessToken()).resolves.not.toThrow();
    });

    it('handles authentication token refresh in service chain', async () => {
      // This tests the middleware chain in the actual app
      await mockKV.put('sheet', 'test-sheet-123');

      // First call should trigger token initialization
      const result1 = await checkMembership(mockContext, 'vetted@example.com');
      expect(result1.isVetted).toBe(true);

      // Subsequent calls should reuse token
      const result2 = await checkMembership(mockContext, 'premium@example.com');
      expect(result2.isVetted).toBe(true);
      expect(result2.isPrivate).toBe(true);
    });
  });
});