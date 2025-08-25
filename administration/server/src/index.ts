import { HttpApiBuilder } from '@effect/platform';
import { toNodeHandler } from 'better-auth/node';
import cors from 'cors';
import dotenv from 'dotenv';
import { Effect } from 'effect';
import express from 'express';
import { ApiLive } from './api';
import {
  BetterAuth,
  BetterAuthLive,
} from './services/effect/layers/BetterAuthLayer';

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

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', (_, res) => {
  res.json({ status: 'ok', message: 'Express server is running' });
});

async function startServer() {
  console.log('Starting Express server with BetterAuth...');

  // Get BetterAuth handler
  const { auth } = await Effect.runSync(
    Effect.scoped(
      Effect.gen(function* () {
        return yield* BetterAuth;
      })
    ).pipe(Effect.provide(BetterAuthLive))
  );
  const authHandler = toNodeHandler(auth);

  // Mount BetterAuth routes - BetterAuth handles its own /api/auth prefix
  app.use('/api/auth', (req, res) => {
    console.log(`[BetterAuth] ${req.method} ${req.url}`);
    // Create a new request with the full path for BetterAuth
    const originalUrl = req.originalUrl;
    req.url = originalUrl; // Give BetterAuth the full original URL
    authHandler(req, res);
  });

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

  // Convert Effect API to Express middleware and mount it
  const { handler: effectHandler } = HttpApiBuilder.toWebHandler(
    // @ts-expect-error I'm not sure what's wrong here, but it seems like it might be a type bug from @effect/platform, which is marked as unstable. Sooooo ignore (2025-08)
    ApiLive
  );

  // Mount Effect API routes for everything else under /api
  app.use('/api', async (req, res, next) => {
    // Skip auth routes - they're handled above
    if (req.path.startsWith('/auth')) {
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
    console.log(`   Health check: http://localhost:${PORT}/health`);
    console.log(`   BetterAuth: http://localhost:${PORT}/api/auth/*`);
    console.log(`   Effect API: http://localhost:${PORT}/api/*`);
  });
}

// Launch the server
startServer();
