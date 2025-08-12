import { betterAuth } from 'better-auth';
import type { Auth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import Database from 'better-sqlite3';
import { Effect } from 'effect';
import path from 'path';
import { EmailService, getEmailServiceLayer } from './services/effect/EmailEffects';

// Get database path from environment or use default
const dbPath =
  process.env.DATABASE_PATH || path.join(__dirname, '../data/club.db');

export const auth: ReturnType<typeof betterAuth> = betterAuth({
  database: new Database(dbPath),

  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',

  // Disable email/password since we only use magic links
  emailAndPassword: {
    enabled: false,
  },

  // Configure magic link plugin
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url, token }, request) => {
        // Use Effect-based email service
        const emailLayer = getEmailServiceLayer();
        
        const sendEmailEffect = Effect.gen(function* () {
          const emailService = yield* EmailService;
          yield* emailService.sendMagicLink(email, url);
        });
        
        try {
          await Effect.runPromise(
            sendEmailEffect.pipe(Effect.provide(emailLayer))
          );
        } catch (error) {
          console.error('Failed to send magic link email:', error);
          // Don't fail the auth flow if email fails in development
          if (process.env.NODE_ENV === 'development') {
            console.log(`[FALLBACK] Magic link URL: ${url}`);
          } else {
            throw error;
          }
        }
      },
      expiresIn: 60 * 15, // 15 minutes
    }),
  ],

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // Cache for 5 minutes
    },
  },

  // CORS configuration
  trustedOrigins: [
    process.env.CLIENT_URL || 'http://localhost:5173',
  ],

  // Advanced configuration
  advanced: {
    cookiePrefix: 'hmu-auth',
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
});