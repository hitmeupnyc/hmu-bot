import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import { Context, Effect, Layer } from 'effect';

import { DatabaseLive, DatabaseService } from './DatabaseLayer';

// Create a typed auth instance with plugins to capture enhanced types
const createAuthWithPlugins = (database: any, config: any) => {
  return betterAuth({
    database,
    baseURL: config.baseURL,
    emailAndPassword: {
      enabled: false, // We only use magic links
    },
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          // Stub for Phase 2 - will be replaced with actual email service
          console.log(`                     👇`);
          console.log(`Send magic link 👉 ${url} 👈 to ${email}`);
          console.log(`                     ☝️`);
          // TODO: Integrate with email service, `EmailEffects.ts`
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
    const auth = createAuthWithPlugins(sqliteDb, {
      baseURL: 'http://localhost:5173',
      clientURL: 'http://localhost:5173',
      magicLinkExpiresIn: 60 * 15, // 15 minutes
      sessionExpiresIn: 60 * 60 * 24 * 7, // 7 days
      sessionUpdateAge: 60 * 60 * 24, // 1 day
    });

    return { auth };
  })
).pipe(Layer.provide(DatabaseLive));
