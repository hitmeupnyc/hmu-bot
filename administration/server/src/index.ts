import {
  HttpApiBuilder,
  HttpApiSwagger,
  HttpMiddleware,
  HttpServer,
} from '@effect/platform';
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node';
import dotenv from 'dotenv';
import { Effect, Layer, Logger, LogLevel } from 'effect';
import { createServer } from 'node:http';
import { ApiLive } from './api';
import { ApplicationLive } from './services/effect/adapters/expressAdapter';
import { NodeSdkLive } from './services/effect/adapters/observabilityUtils';
import { BetterAuthLive } from './services/effect/layers/BetterAuthLayer';
import { AuthLive } from './services/effect/layers/AuthLayer';
import { AuthenticationLive, AuthorizationLive } from './middleware/auth';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Unified server with all routes including auth handled by Effect HttpApi
const ServerLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  // Documentation
  Layer.provide(HttpApiSwagger.layer({ 
    path: '/docs',
    openApi: { 
      info: {
        title: "Club Management System API",
        version: "1.0.0",
        description: "RESTful API for managing club members, events, and authentication"
      }
    }
  })),
  
  // Cross-cutting concerns
  Layer.provide(HttpApiBuilder.middlewareCors({
    allowedOrigins: ['http://localhost:5173'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cookie'],
    allowCredentials: true
  })),
  
  // Authentication & authorization
  Layer.provide(AuthenticationLive),
  Layer.provide(AuthorizationLive),
  
  // API implementation
  Layer.provide(ApiLive),
  
  // Application services
  Layer.provide(ApplicationLive),
  Layer.provide(NodeSdkLive),
  Layer.provide(AuthLive),
  Layer.provide(BetterAuthLive),
  
  // HTTP server
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: PORT }))
);

// Configure logging level
const MainLive = ServerLive.pipe(
  Layer.provide(Logger.minimumLogLevel(LogLevel.Info))
);

// Launch the unified server
Layer.launch(MainLive).pipe(NodeRuntime.runMain);
