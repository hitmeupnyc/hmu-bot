import { NodeSdk } from '@effect/opentelemetry/index';
import { HttpApiBuilder } from '@effect/platform';
import {
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { toNodeHandler } from 'better-auth/node';
import cors from 'cors';
import dotenv from 'dotenv';
import { Effect, Layer } from 'effect';
import express from 'express';
import { ApiLive } from '~/api';
import { Auth, AuthLive } from '~/layers/auth';
import { auditMiddleware } from '~/middleware/auditLogging';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Create Express app
const app = express();

// CORS middleware
app.use(
  cors({
    origin: ['http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cookie',
    ],
  })
);

// Don't add express.json() before BetterAuth - will be added after

// Health check route
app.get('/health', (_, res) => {
  res.json({ status: 'ok', message: 'Express server is running' });
});

async function startServer() {
  console.log('Starting Express server with BetterAuth...');

  const { auth } = await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        return yield* Auth;
      })
    ).pipe(Effect.provide(AuthLive))
  );
  const authHandler = toNodeHandler(auth);

  app.all('/api/auth/*', (req, res) => {
    console.log(`[BetterAuth] ${req.method} ${req.url} ${req.originalUrl}`);
    authHandler(req, res);
  });

  // Add JSON parsing middleware after BetterAuth routes are mounted
  app.use(express.json());

  // In test mode, add endpoint to get magic link for testing
  if (process.env.NODE_ENV === 'test') {
    console.log('⚠️  BetterAuth running in TEST MODE - accepting test tokens');

    app.post('/api/test-magic-link', async (req, res) => {
      try {
        const { email = 'test@hitmeupnyc.com' } = req.body || {};
        const testToken = 'test-token-e2e';

        // Generate the magic link URL directly using the test token
        const magicLinkUrl = `http://localhost:5173/api/auth/magic-link/verify?token=${testToken}&callbackURL=${encodeURIComponent('/')}`;

        console.log(`Test magic link generated: ${magicLinkUrl}`);

        res.json({
          success: true,
          magicLinkUrl,
          email,
          message: 'Magic link generated for testing',
        });
      } catch (error) {
        console.error('Error generating test magic link:', error);
        res.status(500).json({ error: 'Failed to generate test magic link' });
      }
    });
  }

  // Add audit logging middleware for all API routes (except auth)
  app.use(auditMiddleware);

  // TODO: fix this, it's super neat to have
  // const MainServer = HttpApiSwagger.layer({
  //   path: '/api/docs',
  //   // @ts-ignore also seemingly busted types?
  //   openApi: {
  //     info: {
  //       title: 'Club Management System API',
  //       version: '1.0.0',
  //       description:
  //         'RESTful API for managing club members, events, and authentication',
  //     },
  //   },
  // }).pipe(Layer.provide(ApiLive));

  const NodeSdkLive = NodeSdk.layer(() => ({
    resource: { serviceName: 'club-management-api' },
    spanProcessor: new SimpleSpanProcessor(new ConsoleSpanExporter()),
  }));
  const Prod = ApiLive.pipe(Layer.provide(NodeSdkLive));

  // Convert Effect API to Express middleware and mount it
  const { handler: effectHandler } = HttpApiBuilder.toWebHandler(
    // @ts-expect-error I'm not sure what's wrong here, but it seems like it might be a type bug from @effect/platform, which is marked as unstable. Sooooo ignore (2025-08)
    Prod
  );

  // Mount Effect API routes for everything else under /api
  app.use('/api', async (req, res, next) => {
    // Skip auth routes and test-auth routes - they're handled above
    if (req.path.startsWith('/auth') || req.path.startsWith('/test-auth')) {
      return next();
    }

    console.log(`[Effect] ${req.method} ${req.originalUrl}`);

    try {
      // Create a Web API Request from Express request
      const url = `http://localhost:${PORT}${req.originalUrl}`;
      const request = new Request(url, {
        method: req.method,
        headers: req.headers as Record<string, string>,
        body:
          req.method !== 'GET' && req.method !== 'HEAD'
            ? JSON.stringify(req.body)
            : undefined,
      });

      const response = await effectHandler(request);

      // Convert Web API Response back to Express response
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      res.status(response.status);

      if (response.body) {
        const body = await response.text();
        res.send(body);
      } else {
        res.end();
      }
    } catch (error) {
      console.error('Effect API error:', error);
      res.status(500).json({ message: 'Internal server error', error });
    }
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Not found', path: req.originalUrl });
  });

  // Start server
  app.listen(PORT, () => {
    console.log(`✅ Express server running on http://localhost:${PORT}`);
  });
}

// Launch the server
startServer();
