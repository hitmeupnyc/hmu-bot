import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import { Context, Effect, Layer } from 'effect';
import { Kysely } from 'kysely';
import type { DB as DatabaseSchema } from '~/types';

import { DatabaseLive, DatabaseService } from './DatabaseLayer';

// Email validation function to check if email is allowed
const validateEmailAccess = async (
  email: string,
  dbService: any
): Promise<boolean> => {
  // Allow any email ending with @hitmeupnyc.com
  if (email.endsWith('@hitmeupnyc.com')) {
    return true;
  }

  // Check if email exists in members table
  try {
    const member = await Effect.runPromise(
      dbService.query(async (db: Kysely<DatabaseSchema>) => {
        return db
          .selectFrom('members')
          .select('id')
          .where('email', '=', email)
          .executeTakeFirst();
      })
    );

    return member !== undefined;
  } catch (error) {
    console.error('Error validating email access:', error);
    return false;
  }
};

// Create a typed auth instance with plugins to capture enhanced types
const createAuthWithPlugins = (database: any, config: any, dbService: any) => {
  return betterAuth({
    database,
    baseURL: config.baseURL,
    emailAndPassword: { enabled: false },
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          // Only actually send email if it's found in the membership list
          const isAllowed = (
            await Promise.allSettled([validateEmailAccess(email, dbService)])
          ).every((p) => p.status === 'fulfilled' && p.value);

          if (isAllowed) {
            console.log(`====================================================`);
            console.log(`magic link 👉 ${url} 👈 to ${email}`);
            console.log(`====================================================`);

            // TODO: Integrate with email service, `EmailEffects.ts`
          }
        },
        expiresIn: config.magicLinkExpiresIn,
      }),
    ],
    session: {
      expiresIn: config.sessionExpiresIn,
      updateAge: config.sessionUpdateAge,
    },
    trustedOrigins: [config.clientURL],
  });
};

// Extract the type of the configured auth instance
type AuthWithPlugins = ReturnType<typeof createAuthWithPlugins>;

export interface IBetterAuth {
  readonly auth: AuthWithPlugins;
}

export const BetterAuth = Context.GenericTag<IBetterAuth>('BetterAuth');

export const BetterAuthLive = Layer.effect(
  BetterAuth,
  Effect.gen(function* () {
    const dbService = yield* DatabaseService;

    // Get the raw sqlite database for better-auth
    const sqliteDb = yield* dbService.querySync((db) => db);

    // Use the typed factory function to create auth with proper plugin types
    const auth = createAuthWithPlugins(
      sqliteDb,
      {
        baseURL: 'http://localhost:5173',
        clientURL: 'http://localhost:5173',
        magicLinkExpiresIn: 60 * 15, // 15 minutes
        sessionExpiresIn: 60 * 60 * 24 * 7, // 7 days
        sessionUpdateAge: 60 * 60 * 24, // 1 day
      },
      dbService
    );

    return { auth };
  })
).pipe(Layer.provide(DatabaseLive));
