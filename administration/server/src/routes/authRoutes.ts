import { toNodeHandler } from 'better-auth/node';
import { Router } from 'express';
import { Effect } from 'effect';

import { BetterAuthService } from '../services/effect/AuthService';
import { AuthLayer } from '../services/effect/layers/AuthLayer';

export const authRoutes = Router();

// Initialize the auth handler with proper dependency injection
const authHandlerEffect = Effect.gen(function* () {
  const betterAuthService = yield* BetterAuthService;
  return toNodeHandler(betterAuthService.auth);
}).pipe(
  Effect.provide(AuthLayer)
);

// Handle all auth routes
authRoutes.use('*', async (req, res) => {
  try {
    const handler = await Effect.runPromise(authHandlerEffect);
    handler(req, res);
  } catch (error) {
    console.error('Auth handler error:', error);
    res.status(500).json({ error: 'Authentication service error' });
  }
});