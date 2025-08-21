import { betterAuth } from 'better-auth';
import { toNodeHandler } from 'better-auth/node';
import { magicLink } from 'better-auth/plugins';
import { Context, Effect, Layer } from 'effect';

import { DatabaseLive, DatabaseService } from './DatabaseLayer';

export interface IBetterAuth {
  readonly auth: ReturnType<typeof betterAuth>;
  readonly toNodeHandler: () => ReturnType<typeof toNodeHandler>;
}

export const BetterAuth = Context.GenericTag<IBetterAuth>('BetterAuth');

export const BetterAuthLive = Layer.effect(
  BetterAuth,
  Effect.gen(function* () {
    const config = {
      baseURL: 'http://localhost:3000',
      clientURL: 'http://localhost:5173',
      magicLinkExpiresIn: 60 * 15, // 15 minutes
      sessionExpiresIn: 60 * 60 * 24 * 7, // 7 days
      sessionUpdateAge: 60 * 60 * 24, // 1 day
    };
    const dbService = yield* DatabaseService;

    // Get the raw sqlite database for better-auth
    const sqliteDb = yield* dbService.querySync((db) => db);
    const auth = betterAuth({
      database: sqliteDb,

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

    return {
      auth,
      toNodeHandler: () => toNodeHandler(auth),
    };
  })
).pipe(Layer.provide(DatabaseLive));
