import { Effect, Context, Layer, Config, Data } from 'effect';

// Email Errors
export class EmailSendError extends Data.TaggedError('EmailSendError')<{
  message: string;
  recipient: string;
  statusCode?: number;
}> {}

export class EmailConfigError extends Data.TaggedError('EmailConfigError')<{
  message: string;
}> {}

// Email Service Interface
export interface EmailService {
  readonly sendMagicLink: (
    recipient: string,
    magicLinkUrl: string,
  ) => Effect.Effect<void, EmailSendError>;
  
  readonly sendVerificationCode: (
    recipient: string,
    code: string,
  ) => Effect.Effect<void, EmailSendError>;
  
  readonly sendRawEmail: (params: {
    recipient: string;
    subject: string;
    textContent: string;
    htmlContent?: string;
  }) => Effect.Effect<void, EmailSendError>;
}

export const EmailService = Context.GenericTag<EmailService>('EmailService');

// Mailjet Configuration
interface MailjetConfig {
  apiKey: string;
  apiSecret: string;
  fromEmail: string;
  fromName: string;
}

const makeMailjetConfig = Effect.gen(function* () {
  const apiKey = process.env.MAILJET_API_KEY || '';
  const apiSecret = process.env.MAILJET_API_SECRET || '';
  
  if (!apiKey || !apiSecret) {
    return yield* Effect.fail(
      new EmailConfigError({
        message: 'Mailjet API credentials not configured',
      })
    );
  }
  
  return {
    apiKey,
    apiSecret,
    fromEmail: process.env.EMAIL_FROM || 'hello@hitmeupnyc.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Hit Me Up community',
  } satisfies MailjetConfig;
});

// Mailjet API Client
const sendMailjetEmail = (
  config: MailjetConfig,
  recipient: string,
  subject: string,
  textContent: string,
  htmlContent?: string
) =>
  Effect.tryPromise({
    try: async () => {
      const authString = btoa(`${config.apiKey}:${config.apiSecret}`);
      
      const response = await fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${authString}`,
        },
        body: JSON.stringify({
          Messages: [
            {
              From: {
                Email: config.fromEmail,
                Name: config.fromName,
              },
              To: [
                {
                  Email: recipient,
                  Name: 'HMU Member',
                },
              ],
              Subject: subject,
              TextPart: textContent,
              ...(htmlContent && { HTMLPart: htmlContent }),
            },
          ],
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(
          `Mailjet API error: ${response.status} - ${JSON.stringify(result)}`
        );
      }
      
      // Log successful send
      console.log(`Email sent to ${recipient}: ${response.status}`, result);
      
      return result;
    },
    catch: (error) =>
      new EmailSendError({
        message: error instanceof Error ? error.message : 'Unknown email error',
        recipient,
        statusCode: undefined,
      }),
  });

// Email Service Implementation
const makeEmailService = (config: MailjetConfig): EmailService => ({
  sendMagicLink: (recipient, magicLinkUrl) =>
    Effect.gen(function* () {
      const subject = 'Sign in to HMU Administration';
      const textContent = `Click this link to sign in: ${magicLinkUrl}\n\nThis link will expire in 15 minutes.\n\nIf you didn't request this, please ignore this email.`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Sign in to HMU Administration</h2>
          <p>Click the button below to sign in:</p>
          <div style="margin: 30px 0;">
            <a href="${magicLinkUrl}" 
               style="background-color: #3b82f6; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Sign In
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Or copy and paste this link: <br>
            <code>${magicLinkUrl}</code>
          </p>
          <p style="color: #666; font-size: 14px;">
            This link will expire in 15 minutes.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            If you didn't request this email, you can safely ignore it.
          </p>
        </div>
      `;
      
      yield* sendMailjetEmail(config, recipient, subject, textContent, htmlContent);
    }),
  
  sendVerificationCode: (recipient, code) =>
    Effect.gen(function* () {
      const subject = 'Your HMU confirmation code';
      const textContent = `Your confirmation code is ${code}. It expires in 5 minutes.`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your Confirmation Code</h2>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; 
                      text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">
              ${code}
            </span>
          </div>
          <p style="color: #666;">
            This code expires in 5 minutes.
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            If you didn't request this code, please ignore this email.
          </p>
        </div>
      `;
      
      yield* sendMailjetEmail(config, recipient, subject, textContent, htmlContent);
    }),
  
  sendRawEmail: ({ recipient, subject, textContent, htmlContent }) =>
    sendMailjetEmail(config, recipient, subject, textContent, htmlContent),
});

// Email Service Layers

// Production layer - uses Mailjet
export const EmailServiceLive = Layer.effect(
  EmailService,
  Effect.gen(function* () {
    const config = yield* makeMailjetConfig;
    return makeEmailService(config);
  })
);

// Development layer - logs to console
export const EmailServiceDev = Layer.succeed(
  EmailService,
  {
    sendMagicLink: (recipient, magicLinkUrl) =>
      Effect.gen(function* () {
        yield* Effect.log('📧 [DEV EMAIL] Magic Link');
        yield* Effect.log(`  To: ${recipient}`);
        yield* Effect.log(`  URL: ${magicLinkUrl}`);
        console.log('\n' + '='.repeat(60));
        console.log('🔗 MAGIC LINK (Development Mode)');
        console.log('='.repeat(60));
        console.log(`To: ${recipient}`);
        console.log(`URL: ${magicLinkUrl}`);
        console.log('='.repeat(60) + '\n');
      }),
    
    sendVerificationCode: (recipient, code) =>
      Effect.gen(function* () {
        yield* Effect.log('📧 [DEV EMAIL] Verification Code');
        yield* Effect.log(`  To: ${recipient}`);
        yield* Effect.log(`  Code: ${code}`);
        console.log('\n' + '='.repeat(60));
        console.log('🔢 VERIFICATION CODE (Development Mode)');
        console.log('='.repeat(60));
        console.log(`To: ${recipient}`);
        console.log(`Code: ${code}`);
        console.log('='.repeat(60) + '\n');
      }),
    
    sendRawEmail: ({ recipient, subject, textContent }) =>
      Effect.gen(function* () {
        yield* Effect.log('📧 [DEV EMAIL] Raw Email');
        yield* Effect.log(`  To: ${recipient}`);
        yield* Effect.log(`  Subject: ${subject}`);
        yield* Effect.log(`  Content: ${textContent.substring(0, 100)}...`);
      }),
  }
);

// Helper to get the appropriate layer based on environment
export const getEmailServiceLayer = () => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const hasMailjetConfig = 
    process.env.MAILJET_API_KEY && 
    process.env.MAILJET_API_SECRET;
  
  if (isDevelopment && !hasMailjetConfig) {
    console.log('📧 Using development email service (console logging)');
    return EmailServiceDev;
  }
  
  console.log('📧 Using Mailjet email service');
  return EmailServiceLive;
};