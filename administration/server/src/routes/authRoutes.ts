import { Effect } from 'effect';
import { Router } from 'express';

import {
  BetterAuth,
  BetterAuthLive,
} from '../services/effect/layers/BetterAuthLayer';

console.log('Loading authRoutes module');
export const authRoutes = Router();
console.log('Auth router created');

// Temporary simple test handler (specific route first)
authRoutes.get('/test', (_, res) => {
  res.json({ message: 'Auth routes are working' });
});

// Handle all other auth routes directly with Effect
authRoutes.all('*', async (req, res) => {
  try {
    await Effect.runPromise(
      Effect.gen(function* () {
        const betterAuthService = yield* BetterAuth;
        const handler = betterAuthService.toNodeHandler();

        // Fix the request URL for BetterAuth - it expects the full path including /api/auth
        // Express strips the /api/auth prefix when mounting routes
        const originalUrl = req.url;
        req.url = `/api/auth${req.url}`;

        handler(req, res);

        // Restore the original URL
        req.url = originalUrl;
      }).pipe(Effect.provide(BetterAuthLive))
    );
  } catch (error) {
    console.error(`[AUTH] Error in handler:`, error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Authentication service error' });
    }
  }
});
