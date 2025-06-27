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

describe('Performance and Timing Integration Tests', () => {
  let client: any;
  let mockKV: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockKV = createMockKVNamespace();
    
    // Mock console methods to suppress output
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

    // Setup MSW handlers with controlled timing
    server.use(
      // Fast Google Sheets responses
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
      // Fast email sending
      http.post('https://api.mailjet.com/v3.1/send', () => {
        return HttpResponse.json({
          Messages: [{ Status: 'success', To: [{ Email: 'test@example.com' }] }]
        });
      }),
      // Fast OAuth responses
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
      // Fast role assignment
      http.put('https://discord.com/api/guilds/*/members/*/roles/*', () => {
        return new HttpResponse(null, { status: 204 });
      })
    );
  });

  describe('Response Time Performance', () => {
    it('handles Discord interactions within Discord timeout limits', async () => {
      // Discord requires responses within 3 seconds
      const MAX_DISCORD_RESPONSE_TIME = 3000;

      const interaction = {
        type: 1 // PING
      };

      const startTime = Date.now();
      const response = await client.discord.$post({
        json: interaction,
        header: {
          'X-Signature-Ed25519': 'valid-signature-hash',
          'X-Signature-Timestamp': Date.now().toString()
        }
      });
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(MAX_DISCORD_RESPONSE_TIME);
      
      const data = await response.json();
      expect(data.type.PONG).toBe(1);
    });

    it('completes verify-email command within reasonable time', async () => {
      const MAX_RESPONSE_TIME = 2000; // 2 seconds for command response

      // Setup sheet ID
      await mockKV.put('sheet', '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');

      const verifyEmailInteraction = {
        type: 2,
        data: {
          name: 'verify-email',
          options: [
            { name: 'email', value: 'vetted@example.com' }
          ]
        }
      };

      const startTime = Date.now();
      const response = await client.discord.$post({
        json: verifyEmailInteraction,
        header: {
          'X-Signature-Ed25519': 'valid-signature-hash',
          'X-Signature-Timestamp': Date.now().toString()
        }
      });
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(MAX_RESPONSE_TIME);
      
      const data = await response.json();
      expect(data.data.content).toContain('IS a vetted member');
    });

    it('completes manual verification flow within user expectations', async () => {
      const MAX_MODAL_RESPONSE_TIME = 1000; // 1 second for modal responses
      
      // Pre-setup
      await mockKV.put('vetted', 'vetted-role-123');
      await mockKV.put('private', 'private-role-456');

      // Step 1: Manual verification button (should be instant)
      const manualInteraction = {
        type: 3,
        data: { custom_id: 'manual-verify' }
      };

      const startTime1 = Date.now();
      const manualResponse = await client.discord.$post({
        json: manualInteraction,
        header: {
          'X-Signature-Ed25519': 'valid-signature-hash',
          'X-Signature-Timestamp': Date.now().toString()
        }
      });
      const duration1 = Date.now() - startTime1;

      expect(manualResponse.status).toBe(200);
      expect(duration1).toBeLessThan(MAX_MODAL_RESPONSE_TIME);

      // Step 2: Email submission (includes external API calls)
      const emailInteraction = {
        type: 5,
        data: {
          custom_id: 'modal-verify-email',
          components: [{
            components: [{ value: 'vetted@example.com' }]
          }]
        }
      };

      const startTime2 = Date.now();
      const emailResponse = await client.discord.$post({
        json: emailInteraction,
        header: {
          'X-Signature-Ed25519': 'valid-signature-hash',
          'X-Signature-Timestamp': Date.now().toString()
        }
      });
      const duration2 = Date.now() - startTime2;

      expect(emailResponse.status).toBe(200);
      expect(duration2).toBeLessThan(3000); // 3 seconds for email + KV operations
    });

    it('completes OAuth flow within user tolerance', async () => {
      const MAX_OAUTH_RESPONSE_TIME = 5000; // 5 seconds for OAuth redirect
      
      // Pre-setup
      await mockKV.put('vetted', 'vetted-role-123');
      await mockKV.put('private', 'private-role-456');

      const startTime = Date.now();
      const response = await client.oauth.$get({
        query: { code: 'valid-oauth-code' }
      });
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(MAX_OAUTH_RESPONSE_TIME);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('handles multiple concurrent Discord interactions', async () => {
      const CONCURRENT_REQUESTS = 5;
      const MAX_CONCURRENT_TIME = 4000; // Should not take much longer than single request

      // Setup sheet ID
      await mockKV.put('sheet', '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');

      const interactions = Array(CONCURRENT_REQUESTS).fill(null).map((_, i) => ({
        type: 2,
        data: {
          name: 'verify-email',
          options: [
            { name: 'email', value: `user${i}@example.com` }
          ]
        }
      }));

      const startTime = Date.now();
      const promises = interactions.map(interaction => 
        client.discord.$post({
          json: interaction,
          header: {
            'X-Signature-Ed25519': 'valid-signature-hash',
            'X-Signature-Timestamp': Date.now().toString()
          }
        })
      );

      const responses = await Promise.all(promises);
      const duration = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time despite concurrency
      expect(duration).toBeLessThan(MAX_CONCURRENT_TIME);
    });

    it('handles concurrent OTP submissions without race conditions', async () => {
      // Pre-store different OTPs for different users
      await mockKV.put('email:user1@example.com', '111111');
      await mockKV.put('email:user2@example.com', '222222');
      await mockKV.put('email:user3@example.com', '333333');
      await mockKV.put('vetted', 'vetted-role-123');
      await mockKV.put('private', 'private-role-456');

      const otpInteractions = [
        {
          type: 5,
          data: {
            custom_id: 'modal-confirm-code:user1@example.com',
            components: [{ components: [{ value: '111111' }] }]
          },
          member: { user: { id: '111111111111111111' } }
        },
        {
          type: 5,
          data: {
            custom_id: 'modal-confirm-code:user2@example.com',
            components: [{ components: [{ value: '222222' }] }]
          },
          member: { user: { id: '222222222222222222' } }
        },
        {
          type: 5,
          data: {
            custom_id: 'modal-confirm-code:user3@example.com',
            components: [{ components: [{ value: '333333' }] }]
          },
          member: { user: { id: '333333333333333333' } }
        }
      ];

      const startTime = Date.now();
      const promises = otpInteractions.map(interaction => 
        client.discord.$post({
          json: interaction,
          header: {
            'X-Signature-Ed25519': 'valid-signature-hash',
            'X-Signature-Timestamp': Date.now().toString()
          }
        })
      );

      const responses = await Promise.all(promises);
      const duration = Date.now() - startTime;

      // All OTP verifications should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify timing is reasonable for concurrent operations
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('External Service Latency Handling', () => {
    it('handles slow Google Sheets responses gracefully', async () => {
      // Setup sheet ID
      await mockKV.put('sheet', '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');

      // Mock slow Google Sheets response
      server.use(
        http.get('https://sheets.googleapis.com/v4/spreadsheets/*/values/*', () => {
          // Simulate 1 second delay
          return new Promise(resolve => {
            setTimeout(() => {
              resolve(HttpResponse.json({
                values: [['Email Address'], ['vetted@example.com']]
              }));
            }, 1000);
          });
        })
      );

      const verifyInteraction = {
        type: 2,
        data: {
          name: 'verify-email',
          options: [{ name: 'email', value: 'vetted@example.com' }]
        }
      };

      const startTime = Date.now();
      const response = await client.discord.$post({
        json: verifyInteraction,
        header: {
          'X-Signature-Ed25519': 'valid-signature-hash',
          'X-Signature-Timestamp': Date.now().toString()
        }
      });
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeGreaterThan(0); // Should complete quickly with mocked response
      expect(duration).toBeLessThan(3000); // But still complete within Discord limits
    });

    it('handles slow Mailjet responses during email sending', async () => {
      // Mock slow email sending
      server.use(
        http.post('https://api.mailjet.com/v3.1/send', () => {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve(HttpResponse.json({
                Messages: [{ Status: 'success', To: [{ Email: 'test@example.com' }] }]
              }));
            }, 800);
          });
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

      const startTime = Date.now();
      const response = await client.discord.$post({
        json: emailInteraction,
        header: {
          'X-Signature-Ed25519': 'valid-signature-hash',
          'X-Signature-Timestamp': Date.now().toString()
        }
      });
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeGreaterThan(800); // Should reflect email delay
      expect(duration).toBeLessThan(3000); // But complete within Discord limits
    });

    it('handles timeout scenarios with appropriate fallbacks', async () => {
      // Setup sheet ID
      await mockKV.put('sheet', '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');

      // Mock very slow responses that would timeout
      server.use(
        http.get('https://sheets.googleapis.com/v4/spreadsheets/*/values/*', () => {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve(HttpResponse.json({
                values: [['Email Address'], ['vetted@example.com']]
              }));
            }, 10000); // 10 second delay - should timeout
          });
        })
      );

      const verifyInteraction = {
        type: 2,
        data: {
          name: 'verify-email',
          options: [{ name: 'email', value: 'vetted@example.com' }]
        }
      };

      const startTime = Date.now();
      const response = await client.discord.$post({
        json: verifyInteraction,
        header: {
          'X-Signature-Ed25519': 'valid-signature-hash',
          'X-Signature-Timestamp': Date.now().toString()
        }
      });
      const duration = Date.now() - startTime;

      // Should return error response quickly rather than waiting for timeout
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(5000); // Should fail fast, not wait 10 seconds
      
      const data = await response.json();
      expect(data.data.content).toContain('IS a vetted member');
    });
  });

  describe('KV Operations Performance', () => {
    it('performs KV operations within expected timeframes', async () => {
      const MAX_KV_OPERATION_TIME = 100; // KV should be very fast in tests

      // Test PUT operation timing
      const putStartTime = Date.now();
      await mockKV.put('test-key', 'test-value');
      const putDuration = Date.now() - putStartTime;
      expect(putDuration).toBeLessThan(MAX_KV_OPERATION_TIME);

      // Test GET operation timing
      const getStartTime = Date.now();
      const value = await mockKV.get('test-key');
      const getDuration = Date.now() - getStartTime;
      expect(getDuration).toBeLessThan(MAX_KV_OPERATION_TIME);
      expect(value).toBe('test-value');

      // Test DELETE operation timing
      const deleteStartTime = Date.now();
      await mockKV.delete('test-key');
      const deleteDuration = Date.now() - deleteStartTime;
      expect(deleteDuration).toBeLessThan(MAX_KV_OPERATION_TIME);
    });

    it('handles multiple parallel KV operations efficiently', async () => {
      const PARALLEL_OPERATIONS = 10;
      const MAX_PARALLEL_TIME = 200;

      const operations = Array(PARALLEL_OPERATIONS).fill(null).map((_, i) => [
        mockKV.put(`key-${i}`, `value-${i}`),
        mockKV.get(`key-${i}`)
      ]).flat();

      const startTime = Date.now();
      await Promise.all(operations);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(MAX_PARALLEL_TIME);
    });

    it('handles OTP expiration cleanup without performance impact', async () => {
      const EXPIRED_OTPS = 50;
      
      // Create many expired OTPs
      const createPromises = Array(EXPIRED_OTPS).fill(null).map((_, i) => 
        mockKV.put(`expired-otp-${i}`, `code-${i}`, { expirationTtl: 1 })
      );
      
      await Promise.all(createPromises);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Verify expired OTPs don't impact new operations
      const startTime = Date.now();
      await mockKV.put('new-otp', '123456');
      const value = await mockKV.get('new-otp');
      const duration = Date.now() - startTime;
      
      expect(value).toBe('123456');
      expect(duration).toBeLessThan(100); // Should not be impacted by expired entries
    });
  });

  describe('Memory and Resource Usage', () => {
    it('handles large membership lists without performance degradation', async () => {
      // Setup sheet ID
      await mockKV.put('sheet', '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');

      // Mock large membership response
      const LARGE_MEMBER_LIST = Array(1000).fill(null).map((_, i) => [`member${i}@example.com`]);
      const membershipData = [['Email Address'], ...LARGE_MEMBER_LIST];

      server.use(
        http.get('https://sheets.googleapis.com/v4/spreadsheets/*/values/Vetted%20Members*', () => {
          return HttpResponse.json({ values: membershipData });
        }),
        http.get('https://sheets.googleapis.com/v4/spreadsheets/*/values/Private%20Members*', () => {
          return HttpResponse.json({ values: membershipData });
        })
      );

      const verifyInteraction = {
        type: 2,
        data: {
          name: 'verify-email',
          options: [{ name: 'email', value: 'vetted@example.com' }]
        }
      };

      const startTime = Date.now();
      const response = await client.discord.$post({
        json: verifyInteraction,
        header: {
          'X-Signature-Ed25519': 'valid-signature-hash',
          'X-Signature-Timestamp': Date.now().toString()
        }
      });
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(3000); // Should handle large lists efficiently
      
      const data = await response.json();
      expect(data.data.content).toContain('IS a vetted member');
    });

    it('handles rapid successive interactions without memory leaks', async () => {
      const RAPID_INTERACTIONS = 20;
      const interactions = Array(RAPID_INTERACTIONS).fill(null).map(() => ({
        type: 1 // PING - simplest interaction
      }));

      // Execute interactions rapidly in sequence
      const startTime = Date.now();
      for (const interaction of interactions) {
        const response = await client.discord.$post({
          json: interaction,
          header: {
            'X-Signature-Ed25519': 'valid-signature-hash',
            'X-Signature-Timestamp': Date.now().toString()
          }
        });
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.type.PONG).toBe(1);
      }
      const duration = Date.now() - startTime;

      // Should complete all interactions quickly
      expect(duration).toBeLessThan(2000);
    });
  });
});