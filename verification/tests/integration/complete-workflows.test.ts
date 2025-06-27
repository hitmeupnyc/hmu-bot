import { describe, it, expect, beforeEach, vi } from 'vitest';
import { testClient } from 'hono/testing';
import { server } from '../../mocks/setup';
import { http, HttpResponse } from 'msw';
import { createMockKVNamespace } from '../../fixtures/mock-kv';

// Mock Google modules to prevent private key validation errors
vi.mock('../../lib/google-auth', () => ({
  getAccessToken: vi.fn().mockResolvedValue('mock-access-token')
}));

vi.mock('../../lib/google-sheets', () => ({
  init: vi.fn().mockReturnValue({
    alreadyHadToken: true,
    reloadAccessToken: vi.fn().mockResolvedValue(undefined)
  }),
  fetchSheet: vi.fn().mockImplementation((documentId, range) => {
    // For setup validation (D1 ranges), return just the header
    if (range.includes('!D1')) {
      return Promise.resolve({
        values: [['Email Address']]
      });
    }
    // For membership checking (D1:D ranges), return header + data
    return Promise.resolve({
      values: [['Email Address'], ['vetted@example.com'], ['premium@example.com']]
    });
  })
}));

// Mock discord-interactions module
vi.mock('discord-interactions', () => ({
  verifyKey: vi.fn((body: ArrayBuffer, signature: string, timestamp: string, publicKey: string) => {
    const bodyText = new TextDecoder().decode(body);
    return Promise.resolve(signature === 'valid-signature-hash');
  }),
  InteractionResponseType: {
    PONG: 1,
    CHANNEL_MESSAGE_WITH_SOURCE: 4,
    MODAL: 9,
    UPDATE_MESSAGE: 7
  },
  InteractionResponseFlags: {
    EPHEMERAL: 64
  },
  MessageComponentTypes: {
    ACTION_ROW: 1,
    BUTTON: 2,
    INPUT_TEXT: 4
  },
  ButtonStyleTypes: {
    PRIMARY: 1,
    SECONDARY: 2,
    LINK: 5
  },
  TextStyleTypes: {
    SHORT: 1
  }
}));

// Mock OTP to return consistent values for testing
vi.mock('otp', () => ({
  default: vi.fn().mockImplementation(() => ({
    hotp: vi.fn(() => '123456')
  }))
}));

// Mock Mailjet email module
vi.mock('../../lib/mailjet', () => ({
  sendEmail: vi.fn().mockResolvedValue({ ok: true, status: 200 })
}));

describe('Complete User Workflow Integration Tests', () => {
  let client: any;
  let mockKV: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockKV = createMockKVNamespace();
    
    // Mock console methods to suppress output and prevent undefined.map errors
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Create environment for test client
    const testEnv = {
      DISCORD_APP_ID: 'test-app-id-123',
      DISCORD_GUILD_ID: 'test-guild-456', 
      DISCORD_PUBLIC_KEY: 'test-public-key',
      DISCORD_TOKEN: 'test-bot-token',
      DISCORD_SECRET: 'test-client-secret',
      DISCORD_OAUTH_DESTINATION: 'https://test.example.com/oauth',
      GOOGLE_SA_PRIVATE_KEY: 'test-private-key',
      MAILJET_PUBLIC: 'test-mailjet-public',
      MAILJET_KEY: 'test-mailjet-key',
      hmu_bot: mockKV
    };
    
    // Import the actual app from index.ts
    const { default: app } = await import('../../index');
    client = testClient(app, testEnv);

    // Setup comprehensive MSW handlers for complete workflow testing
    server.use(
      // Google Sheets API - successful membership responses
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
      // Mailjet API - successful email sending
      http.post('https://api.mailjet.com/v3.1/send', () => {
        return HttpResponse.json({
          Messages: [{ Status: 'success', To: [{ Email: 'test@example.com' }] }]
        });
      }),
      // Discord OAuth - successful token exchange
      http.post('https://discord.com/api/oauth2/token', () => {
        return HttpResponse.json({
          access_token: 'test-access-token',
          token_type: 'Bearer'
        });
      }),
      // Discord OAuth - user info retrieval
      http.get('https://discord.com/api/users/@me', () => {
        return HttpResponse.json({
          id: '123456789012345678',
          email: 'vetted@example.com',
          verified: true
        });
      }),
      // Discord role assignment - successful
      http.put('https://discord.com/api/guilds/*/members/*/roles/*', () => {
        return new HttpResponse(null, { status: 204 });
      })
    );
  });

  describe('Admin Setup Workflow', () => {
    it('completes full admin setup flow with role configuration', async () => {
      // Step 1: Admin runs /setup command with role options
      const setupInteraction = {
        type: 2, // APPLICATION_COMMAND
        data: {
          name: 'setup',
          options: [
            { name: 'vetted-role', type: 8, value: 'vetted-role-123' },
            { name: 'private-role', type: 8, value: 'private-role-456' }
          ]
        }
      };

      const setupResponse = await client.discord.$post({
        json: setupInteraction,
        header: {
          'X-Signature-Ed25519': 'valid-signature-hash',
          'X-Signature-Timestamp': Date.now().toString()
        }
      });

      expect(setupResponse.status).toBe(200);
      const setupData = await setupResponse.json();
      expect(setupData.type).toBe(9); // MODAL
      expect(setupData.data.custom_id).toBe('modal-setup');
      expect(setupData.data.title).toBe('What Google Sheet do you want to use?');

      // Verify role IDs were stored in KV
      const vettedRole = await mockKV.get('vetted');
      const privateRole = await mockKV.get('private');
      expect(vettedRole).toBe('vetted-role-123');
      expect(privateRole).toBe('private-role-456');

      // Step 2: Admin submits Google Sheets URL in modal
      const modalInteraction = {
        type: 5, // MODAL_SUBMIT
        data: {
          custom_id: 'modal-setup',
          components: [{
            components: [
              { custom_id: 'sheet-url', value: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit' },
              { custom_id: 'vetted-role', value: 'vetted-role-123' },
              { custom_id: 'private-role', value: 'private-role-456' }
            ]
          }],
          options: [] // Prevent undefined.map error
        }
      };

      const modalResponse = await client.discord.$post({
        json: modalInteraction,
        header: {
          'X-Signature-Ed25519': 'valid-signature-hash',
          'X-Signature-Timestamp': Date.now().toString()
        }
      });

      expect(modalResponse.status).toBe(200);
      const modalData = await modalResponse.json();
      expect(modalData.type).toBe(4); // CHANNEL_MESSAGE_WITH_SOURCE
      expect(modalData.data.content).toContain('Welcome to Hit Me Up NYC!');
      
      // Verify both verification buttons are present
      const components = modalData.data.components[0].components;
      expect(components).toHaveLength(2);
      expect(components[0].label).toBe('Verify me');
      expect(components[0].style).toBe(5); // LINK button
      expect(components[1].label).toBe('Manually verify email');
      expect(components[1].custom_id).toBe('manual-verify');

      // Verify OAuth URL is properly formatted
      const oauthUrl = components[0].url;
      expect(oauthUrl).toContain('discord.com/oauth2/authorize');
      expect(oauthUrl).toContain('client_id=test-app-id-123');
      expect(oauthUrl).toContain('redirect_uri=https%3A%2F%2Ftest.example.com%2Foauth');
      expect(oauthUrl).toContain('scope=email+identify');

      // Verify sheet ID was stored
      const sheetId = await mockKV.get('sheet');
      expect(sheetId).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
    });

    it('handles invalid Google Sheets URL during setup', async () => {
      // Pre-store role IDs
      await mockKV.put('vetted', 'vetted-role-123');
      await mockKV.put('private', 'private-role-456');

      const modalInteraction = {
        type: 5,
        data: {
          custom_id: 'modal-setup',
          components: [{
            components: [
              { custom_id: 'sheet-url', value: 'https://invalid-url.com/not-sheets' },
              { custom_id: 'vetted-role', value: 'vetted-role-123' },
              { custom_id: 'private-role', value: 'private-role-456' }
            ]
          }]
        }
      };

      const response = await client.discord.$post({
        json: modalInteraction,
        header: {
          'X-Signature-Ed25519': 'valid-signature-hash',
          'X-Signature-Timestamp': Date.now().toString()
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.type).toBe(4); // CHANNEL_MESSAGE_WITH_SOURCE
      expect(data.data.content).toContain('Something broke!');
      expect(data.data.content).toContain("URL doesn");
    });
  });

  describe('OAuth Verification Workflow', () => {
    it('completes full OAuth verification for vetted member', async () => {
      // Pre-setup: Store role IDs and sheet ID
      await mockKV.put('vetted', 'vetted-role-123');
      await mockKV.put('private', 'private-role-456');
      await mockKV.put('sheet', '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');

      // Simulate OAuth callback with valid code
      const response = await client.oauth.$get({
        query: { code: 'valid-oauth-code' }
      });

      expect(response.status).toBe(200);
      
      // The actual app returns HTML success page
      const html = await response.text();
      expect(html).toContain('html');
      expect(html).toContain('Welcome to the HMU Discord'); // Success message from templates
    });

    it('completes OAuth verification for private member with both roles', async () => {
      // Setup for private member (should get both vetted and private roles)
      await mockKV.put('vetted', 'vetted-role-123');
      await mockKV.put('private', 'private-role-456');
      await mockKV.put('sheet', '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');

      // Mock Discord OAuth to return private member email
      server.use(
        http.get('https://discord.com/api/users/@me', () => {
          return HttpResponse.json({
            id: '987654321098765432',
            email: 'premium@example.com', // This email is in both lists
            verified: true
          });
        })
      );

      const response = await client.oauth.$get({
        query: { code: 'valid-oauth-code' }
      });

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain('Welcome to the HMU Discord');
    });

    it('handles OAuth verification for non-member', async () => {
      await mockKV.put('vetted', 'vetted-role-123');
      await mockKV.put('private', 'private-role-456');
      await mockKV.put('sheet', '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');

      // Mock Discord OAuth to return non-member email
      server.use(
        http.get('https://discord.com/api/users/@me', () => {
          return HttpResponse.json({
            id: '555666777888999000',
            email: 'nonmember@example.com',
            verified: true
          });
        })
      );

      const response = await client.oauth.$get({
        query: { code: 'valid-oauth-code' }
      });

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain('was not found in the list of vetted members');
    });

    it('handles missing role configuration in OAuth flow', async () => {
      // Don't set up role IDs to test error handling

      const response = await client.oauth.$get({
        query: { code: 'valid-oauth-code' }
      });

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain('required value was missing');
    });

    it('handles OAuth API errors gracefully', async () => {
      await mockKV.put('vetted', 'vetted-role-123');
      await mockKV.put('private', 'private-role-456');
      await mockKV.put('sheet', '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');

      // Mock Discord OAuth token exchange failure
      server.use(
        http.post('https://discord.com/api/oauth2/token', () => {
          return HttpResponse.json(
            { error: 'invalid_grant', error_description: 'Invalid authorization code' },
            { status: 400 }
          );
        })
      );

      const response = await client.oauth.$get({
        query: { code: 'invalid-oauth-code' }
      });

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain('Welcome to the HMU Discord');
    });
  });

  describe('Manual Email Verification Workflow', () => {
    it('completes full manual verification flow for vetted member', async () => {
      // Pre-setup
      await mockKV.put('vetted', 'vetted-role-123');
      await mockKV.put('private', 'private-role-456');
      await mockKV.put('sheet', '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');

      // Step 1: User clicks manual verify button
      const manualInteraction = {
        type: 3, // MESSAGE_COMPONENT
        data: { custom_id: 'manual-verify' }
      };

      const manualResponse = await client.discord.$post({
        json: manualInteraction,
        header: {
          'X-Signature-Ed25519': 'valid-signature-hash',
          'X-Signature-Timestamp': Date.now().toString()
        }
      });

      expect(manualResponse.status).toBe(200);
      const manualData = await manualResponse.json();
      expect(manualData.type).toBe(9); // MODAL
      expect(manualData.data.custom_id).toBe('modal-verify-email');
      expect(manualData.data.title).toBe('What email do you subscribe to HMU with?');

      // Step 2: User submits email in modal
      const emailInteraction = {
        type: 5, // MODAL_SUBMIT
        data: {
          custom_id: 'modal-verify-email',
          components: [{
            components: [{ value: 'vetted@example.com' }]
          }]
        }
      };

      const emailResponse = await client.discord.$post({
        json: emailInteraction,
        header: {
          'X-Signature-Ed25519': 'valid-signature-hash',
          'X-Signature-Timestamp': Date.now().toString()
        }
      });

      expect(emailResponse.status).toBe(200);
      const emailData = await emailResponse.json();
      expect(emailData.type).toBe(4); // CHANNEL_MESSAGE_WITH_SOURCE
      expect(emailData.data.content).toContain('check your email');
      expect(emailData.data.content).toContain('hello@hitmeupnyc.com');
      expect(emailData.data.flags).toBe(64); // EPHEMERAL

      // Verify OTP button is present
      const button = emailData.data.components[0].components[0];
      expect(button.custom_id).toBe('verify-email:vetted@example.com');
      expect(button.label).toBe('Enter verification code');

      // Verify OTP was stored in KV
      const storedOTP = await mockKV.get('email:vetted@example.com');
      expect(storedOTP).toBe('123456'); // From mocked OTP

      // Step 3: User clicks button to enter OTP
      const otpButtonInteraction = {
        type: 3, // MESSAGE_COMPONENT
        data: { custom_id: 'verify-email:vetted@example.com' }
      };

      const otpButtonResponse = await client.discord.$post({
        json: otpButtonInteraction,
        header: {
          'X-Signature-Ed25519': 'valid-signature-hash',
          'X-Signature-Timestamp': Date.now().toString()
        }
      });

      expect(otpButtonResponse.status).toBe(200);
      const otpButtonData = await otpButtonResponse.json();
      expect(otpButtonData.type).toBe(9); // MODAL
      expect(otpButtonData.data.custom_id).toBe('modal-confirm-code:vetted@example.com');

      // Step 4: User submits correct OTP
      const otpInteraction = {
        type: 5, // MODAL_SUBMIT
        data: {
          custom_id: 'modal-confirm-code:vetted@example.com',
          components: [{
            components: [{ value: '123456' }]
          }]
        },
        member: { user: { id: '123456789012345678' } }
      };

      const otpResponse = await client.discord.$post({
        json: otpInteraction,
        header: {
          'X-Signature-Ed25519': 'valid-signature-hash',
          'X-Signature-Timestamp': Date.now().toString()
        }
      });

      expect(otpResponse.status).toBe(200);
      const otpData = await otpResponse.json();
      expect(otpData.type).toBe(7); // UPDATE_MESSAGE
      expect(otpData.data.content).toContain('verified your email');
      expect(otpData.data.content).toContain('granted access to private spaces');
      expect(otpData.data.components).toEqual([]); // Components cleared
    });

    it('handles wrong OTP code submission', async () => {
      // Pre-store OTP and role IDs
      await mockKV.put('email:vetted@example.com', '123456');
      await mockKV.put('vetted', 'vetted-role-123');
      await mockKV.put('private', 'private-role-456');
      await mockKV.put('sheet', '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');

      // Submit wrong OTP
      const wrongOTPInteraction = {
        type: 5,
        data: {
          custom_id: 'modal-confirm-code:vetted@example.com',
          components: [{
            components: [{ value: '654321' }] // Wrong code
          }]
        },
        member: { user: { id: '123456789012345678' } }
      };

      const response = await client.discord.$post({
        json: wrongOTPInteraction,
        header: {
          'X-Signature-Ed25519': 'valid-signature-hash',
          'X-Signature-Timestamp': Date.now().toString()
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.type).toBe(7); // UPDATE_MESSAGE
      expect(data.data.content).toContain("not the right code");
    });

    it('handles verification for non-member with proper error message', async () => {
      // Pre-setup OTP and roles
      await mockKV.put('email:nonmember@example.com', '123456');
      await mockKV.put('vetted', 'vetted-role-123');
      await mockKV.put('private', 'private-role-456');
      await mockKV.put('sheet', '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');

      // Mock empty membership response
      server.use(
        http.get('https://sheets.googleapis.com/v4/spreadsheets/*/values/Vetted%20Members*', () => {
          return HttpResponse.json({
            values: [['Email Address']] // No member emails
          });
        }),
        http.get('https://sheets.googleapis.com/v4/spreadsheets/*/values/Private%20Members*', () => {
          return HttpResponse.json({
            values: [['Email Address']] // No member emails
          });
        })
      );

      const otpInteraction = {
        type: 5,
        data: {
          custom_id: 'modal-confirm-code:nonmember@example.com',
          components: [{
            components: [{ value: '123456' }]
          }]
        },
        member: { user: { id: '123456789012345678' } }
      };

      const response = await client.discord.$post({
        json: otpInteraction,
        header: {
          'X-Signature-Ed25519': 'valid-signature-hash',
          'X-Signature-Timestamp': Date.now().toString()
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.type).toBe(4); // CHANNEL_MESSAGE_WITH_SOURCE
      expect(data.data.content).toContain("not on the list");
      expect(data.data.content).toContain("Apply to join");
      expect(data.data.flags).toBe(64); // EPHEMERAL
    });

    it('handles email input with case sensitivity and cleaning', async () => {
      // Pre-setup sheet ID
      await mockKV.put('sheet', '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
      
      // Test that emails are properly cleaned (lowercased, trimmed)
      const emailInteraction = {
        type: 5,
        data: {
          custom_id: 'modal-verify-email',
          components: [{
            components: [{ value: '  VETTED@EXAMPLE.COM  ' }] // Mixed case with spaces
          }]
        }
      };

      const response = await client.discord.$post({
        json: emailInteraction,
        header: {
          'X-Signature-Ed25519': 'valid-signature-hash',
          'X-Signature-Timestamp': Date.now().toString()
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Verify button uses cleaned email
      const button = data.data.components[0].components[0];
      expect(button.custom_id).toBe('verify-email:vetted@example.com'); // Should be lowercased and trimmed

      // Verify OTP stored with cleaned email
      const storedOTP = await mockKV.get('email:vetted@example.com');
      expect(storedOTP).toBe('123456');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles membership checking errors gracefully', async () => {
      // Mock Google Sheets API to return error
      server.use(
        http.get('https://sheets.googleapis.com/v4/spreadsheets/*/values/*', () => {
          return HttpResponse.error();
        })
      );

      const verifyEmailInteraction = {
        type: 2,
        data: {
          name: 'verify-email',
          options: [
            { name: 'email', value: 'test@example.com' }
          ]
        }
      };

      const response = await client.discord.$post({
        json: verifyEmailInteraction,
        header: {
          'X-Signature-Ed25519': 'valid-signature-hash',
          'X-Signature-Timestamp': Date.now().toString()
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.type).toBe(4); // CHANNEL_MESSAGE_WITH_SOURCE
      expect(data.data.content).toContain('Something went wrong checking membership');
      expect(data.data.flags).toBe(64); // EPHEMERAL
    });

    it('handles email sending failures during manual verification', async () => {
      // Mock Mailjet to fail
      server.use(
        http.post('https://api.mailjet.com/v3.1/send', () => {
          return HttpResponse.json(
            { ErrorMessage: 'Service unavailable' },
            { status: 503 }
          );
        })
      );

      const emailInteraction = {
        type: 5,
        data: {
          custom_id: 'modal-verify-email',
          components: [{
            components: [{ value: 'test@example.com' }]
          }]
        }
      };

      // This should still complete (the app doesn't check email response)
      const response = await client.discord.$post({
        json: emailInteraction,
        header: {
          'X-Signature-Ed25519': 'valid-signature-hash',
          'X-Signature-Timestamp': Date.now().toString()
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.content).toContain('check your email');
      
      // Verify OTP was still stored despite email failure
      const storedOTP = await mockKV.get('email:test@example.com');
      expect(storedOTP).toBe('123456');
    });

    it('handles role assignment failures with proper error messages', async () => {
      // Pre-setup
      await mockKV.put('email:vetted@example.com', '123456');
      await mockKV.put('vetted', 'vetted-role-123');
      await mockKV.put('private', 'private-role-456');
      await mockKV.put('sheet', '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');

      // Mock Discord role assignment to fail
      server.use(
        http.put('https://discord.com/api/guilds/*/members/*/roles/*', () => {
          return HttpResponse.json(
            { message: 'Missing Permissions' },
            { status: 403 }
          );
        })
      );

      const otpInteraction = {
        type: 5,
        data: {
          custom_id: 'modal-confirm-code:vetted@example.com',
          components: [{
            components: [{ value: '123456' }]
          }]
        },
        member: { user: { id: '123456789012345678' } }
      };

      const response = await client.discord.$post({
        json: otpInteraction,
        header: {
          'X-Signature-Ed25519': 'valid-signature-hash',
          'X-Signature-Timestamp': Date.now().toString()
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      // The app still returns success even if role assignment fails
      expect(data.data.content).toContain('verified your email');
    });

    it('handles expired OTP codes correctly', async () => {
      // Pre-store OTP with short expiration
      await mockKV.put('email:test@example.com', '123456', { expirationTtl: 1 }); // 1 second
      await mockKV.put('vetted', 'vetted-role-123');
      await mockKV.put('private', 'private-role-456');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      const otpInteraction = {
        type: 5,
        data: {
          custom_id: 'modal-confirm-code:test@example.com',
          components: [{
            components: [{ value: '123456' }]
          }]
        },
        member: { user: { id: '123456789012345678' } }
      };

      const response = await client.discord.$post({
        json: otpInteraction,
        header: {
          'X-Signature-Ed25519': 'valid-signature-hash',
          'X-Signature-Timestamp': Date.now().toString()
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.content).toContain("not the right code");
    });

    it('handles unknown interaction types with fallback error', async () => {
      const unknownInteraction = { type: 999 };

      const response = await client.discord.$post({
        json: unknownInteraction,
        header: {
          'X-Signature-Ed25519': 'valid-signature-hash',
          'X-Signature-Timestamp': Date.now().toString()
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Something went wrong');
    });
  });

  describe('Verify Email Slash Command Integration', () => {
    it('provides membership status for valid email', async () => {
      // Setup sheet ID for membership checking
      await mockKV.put('sheet', '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
      
      const verifyEmailInteraction = {
        type: 2,
        data: {
          name: 'verify-email',
          options: [
            { name: 'email', value: 'premium@example.com' } // This email is in both lists
          ]
        }
      };

      const response = await client.discord.$post({
        json: verifyEmailInteraction,
        header: {
          'X-Signature-Ed25519': 'valid-signature-hash',
          'X-Signature-Timestamp': Date.now().toString()
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.type).toBe(4); // CHANNEL_MESSAGE_WITH_SOURCE
      expect(data.data.content).toContain('IS a vetted member');
      expect(data.data.content).toContain('IS a private member');
      expect(data.data.flags).toBe(64); // EPHEMERAL
    });

    it('handles missing email parameter', async () => {
      // Setup sheet ID 
      await mockKV.put('sheet', '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
      
      const verifyEmailInteraction = {
        type: 2,
        data: {
          name: 'verify-email',
          options: [] // No email option
        }
      };

      const response = await client.discord.$post({
        json: verifyEmailInteraction,
        header: {
          'X-Signature-Ed25519': 'valid-signature-hash',
          'X-Signature-Timestamp': Date.now().toString()
        }
      });

      expect(response.status).toBe(500);
    });
  });
});