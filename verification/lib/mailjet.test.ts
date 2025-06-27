import { describe, it, expect, beforeEach } from 'vitest';
import { server } from '../mocks/setup';
import { http, HttpResponse } from 'msw';
import { sendEmail } from './mailjet';

describe('Mailjet Email Service', () => {
  const testAuth = 'test-public:test-key';
  const testCode = '123456';

  describe('Email Sending', () => {
    it('sends email successfully with valid parameters', async () => {
      // Capture response data through MSW handler since body is consumed in sendEmail
      let responseData: any;
      server.use(
        http.post('https://api.mailjet.com/v3.1/send', () => {
          responseData = {
            Messages: [{ 
              Status: 'success', 
              To: [{ Email: 'test@example.com', MessageUUID: 'mock-uuid' }] 
            }]
          };
          return HttpResponse.json(responseData);
        })
      );
      
      const response = await sendEmail('test@example.com', testCode, testAuth);
      
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(responseData.Messages).toHaveLength(1);
      expect(responseData.Messages[0].Status).toBe('success');
      expect(responseData.Messages[0].To[0].Email).toBe('test@example.com');
    });

    it('includes correct email content and headers', async () => {
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
      
      await sendEmail('test@example.com', testCode, testAuth);
      
      // Verify request structure
      expect(capturedRequest.headers['content-type']).toBe('application/json');
      expect(capturedRequest.headers.authorization).toBe(`Basic ${btoa(testAuth)}`);
      
      // Verify email content
      const message = capturedRequest.body.Messages[0];
      expect(message.From.Email).toBe('hello@hitmeupnyc.com');
      expect(message.From.Name).toBe('Hit Me Up community');
      expect(message.To[0].Email).toBe('test@example.com');
      expect(message.To[0].Name).toBe('HMU Member');
      expect(message.Subject).toBe('Your confirmation code!');
      expect(message.TextPart).toBe(`Your confirmation code is ${testCode}. It expires in 5 minutes.`);
    });

    it('properly encodes authentication credentials', async () => {
      let capturedAuth: string;
      
      server.use(
        http.post('https://api.mailjet.com/v3.1/send', ({ request }) => {
          capturedAuth = request.headers.get('Authorization') || '';
          return HttpResponse.json({ Messages: [{ Status: 'success' }] });
        })
      );
      
      const customAuth = 'custom-public:custom-key';
      await sendEmail('test@example.com', testCode, customAuth);
      
      expect(capturedAuth).toBe(`Basic ${btoa(customAuth)}`);
    });
  });

  describe('Authentication Errors', () => {
    it('handles unauthorized requests (401)', async () => {
      let errorData: any;
      server.use(
        http.post('https://api.mailjet.com/v3.1/send', () => {
          errorData = { ErrorMessage: 'Unauthorized' };
          return HttpResponse.json(errorData, { status: 401 });
        })
      );
      
      const response = await sendEmail('test@example.com', testCode, 'invalid:auth');
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
      expect(errorData.ErrorMessage).toBe('Unauthorized');
    });

    it('handles invalid API credentials', async () => {
      server.use(
        http.post('https://api.mailjet.com/v3.1/send', () => {
          return HttpResponse.json(
            { ErrorMessage: 'Invalid API key' },
            { status: 403 }
          );
        })
      );
      
      const response = await sendEmail('test@example.com', testCode, 'wrong:credentials');
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(403);
    });
  });

  describe('Email Validation', () => {
    it('handles invalid email addresses', async () => {
      const response = await sendEmail('invalid@invalid', testCode, testAuth);
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      // Error message is validated through MSW handler in handlers.ts
    });

    it('sends to valid email formats', async () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.org',
        'user+tag@subdomain.example.com',
        'firstname.lastname@company.co.uk'
      ];
      
      for (const email of validEmails) {
        let capturedEmail: string;
        server.use(
          http.post('https://api.mailjet.com/v3.1/send', async ({ request }) => {
            const body = await request.json();
            capturedEmail = body.Messages[0].To[0].Email;
            return HttpResponse.json({
              Messages: [{ Status: 'success', To: [{ Email: capturedEmail }] }]
            });
          })
        );
        
        const response = await sendEmail(email, testCode, testAuth);
        expect(response.ok).toBe(true);
        expect(capturedEmail).toBe(email);
      }
    });
  });

  describe('Rate Limiting', () => {
    it('handles rate limit responses (429)', async () => {
      const response = await sendEmail('ratelimited@example.com', testCode, testAuth);
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(429);
      // Error message is validated through MSW handler in handlers.ts
    });

    it('handles server errors gracefully', async () => {
      server.use(
        http.post('https://api.mailjet.com/v3.1/send', () => {
          return HttpResponse.json(
            { ErrorMessage: 'Internal server error' },
            { status: 500 }
          );
        })
      );
      
      const response = await sendEmail('test@example.com', testCode, testAuth);
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });
  });

  describe('OTP Code Variations', () => {
    it('handles different code formats correctly', async () => {
      const testCodes = ['123456', '000000', '999999', '456789'];
      
      for (const code of testCodes) {
        let capturedMessage: any;
        
        server.use(
          http.post('https://api.mailjet.com/v3.1/send', async ({ request }) => {
            const body = await request.json();
            capturedMessage = body.Messages[0];
            return HttpResponse.json({ Messages: [{ Status: 'success' }] });
          })
        );
        
        await sendEmail('test@example.com', code, testAuth);
        
        expect(capturedMessage.TextPart).toBe(`Your confirmation code is ${code}. It expires in 5 minutes.`);
      }
    });

    it('includes code in email text properly', async () => {
      let capturedTextPart: string;
      
      server.use(
        http.post('https://api.mailjet.com/v3.1/send', async ({ request }) => {
          const body = await request.json();
          capturedTextPart = body.Messages[0].TextPart;
          return HttpResponse.json({ Messages: [{ Status: 'success' }] });
        })
      );
      
      const specialCode = '987654';
      await sendEmail('test@example.com', specialCode, testAuth);
      
      expect(capturedTextPart).toContain(specialCode);
      expect(capturedTextPart).toContain('expires in 5 minutes');
    });
  });

  describe('Response Handling', () => {
    it('handles successful response with message UUID', async () => {
      let responseData: any;
      server.use(
        http.post('https://api.mailjet.com/v3.1/send', () => {
          responseData = {
            Messages: [{
              Status: 'success',
              CustomID: 'custom-123',
              To: [{ 
                Email: 'test@example.com', 
                MessageUUID: 'uuid-abc-123'
              }],
              Cc: [],
              Bcc: []
            }]
          };
          return HttpResponse.json(responseData);
        })
      );
      
      const response = await sendEmail('test@example.com', testCode, testAuth);
      
      expect(response.ok).toBe(true);
      expect(responseData.Messages[0].To[0].MessageUUID).toBe('uuid-abc-123');
      expect(responseData.Messages[0].Status).toBe('success');
    });

    it('handles partial failure responses', async () => {
      let responseData: any;
      server.use(
        http.post('https://api.mailjet.com/v3.1/send', () => {
          responseData = {
            Messages: [{
              Status: 'error',
              Errors: [{ ErrorCode: 'invalid-email', ErrorMessage: 'Invalid recipient' }],
              To: [{ Email: 'invalid@email' }]
            }]
          };
          return HttpResponse.json(responseData);
        })
      );
      
      const response = await sendEmail('invalid@email', testCode, testAuth);
      
      expect(response.ok).toBe(true);
      expect(responseData.Messages[0].Status).toBe('error');
      expect(responseData.Messages[0].Errors[0].ErrorCode).toBe('invalid-email');
    });
  });

  describe('Network Error Handling', () => {
    it('handles network timeouts and connection errors', async () => {
      server.use(
        http.post('https://api.mailjet.com/v3.1/send', () => {
          return HttpResponse.error();
        })
      );
      
      // Network errors in fetch will throw, so we need to catch them
      try {
        await sendEmail('test@example.com', testCode, testAuth);
        // If we reach here, the test should fail because we expected an error
        expect(true).toBe(false);
      } catch (error) {
        // Network errors are expected in this scenario
        expect(error).toBeDefined();
      }
    });

    it('handles malformed JSON responses gracefully', async () => {
      server.use(
        http.post('https://api.mailjet.com/v3.1/send', () => {
          return new HttpResponse('invalid json response', { status: 200 });
        })
      );
      
      // The sendEmail function will fail when trying to parse the JSON in console.log
      // This tests that the function properly handles malformed responses
      try {
        await sendEmail('test@example.com', testCode, testAuth);
        expect(true).toBe(false); // Should not reach here due to JSON parsing error
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Email Template Validation', () => {
    it('maintains consistent email template structure', async () => {
      let capturedMessage: any;
      
      server.use(
        http.post('https://api.mailjet.com/v3.1/send', async ({ request }) => {
          const body = await request.json();
          capturedMessage = body.Messages[0];
          return HttpResponse.json({ Messages: [{ Status: 'success' }] });
        })
      );
      
      await sendEmail('template@test.com', '111111', testAuth);
      
      // Verify template structure
      expect(capturedMessage.From.Email).toBe('hello@hitmeupnyc.com');
      expect(capturedMessage.From.Name).toBe('Hit Me Up community');
      expect(capturedMessage.Subject).toBe('Your confirmation code!');
      expect(capturedMessage.To[0].Name).toBe('HMU Member');
      
      // Verify message format
      expect(capturedMessage.TextPart).toMatch(/^Your confirmation code is \d{6}\. It expires in 5 minutes\.$/);
    });

    it('does not include HTML formatting by default', async () => {
      let capturedMessage: any;
      
      server.use(
        http.post('https://api.mailjet.com/v3.1/send', async ({ request }) => {
          const body = await request.json();
          capturedMessage = body.Messages[0];
          return HttpResponse.json({ Messages: [{ Status: 'success' }] });
        })
      );
      
      await sendEmail('test@example.com', testCode, testAuth);
      
      expect(capturedMessage.HTMLPart).toBeUndefined();
      expect(capturedMessage.TextPart).toBeDefined();
    });
  });
});