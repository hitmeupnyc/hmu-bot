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

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const ServerLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  Layer.provide(HttpApiSwagger.layer({ path: '/docs' })),
  Layer.provide(HttpApiBuilder.middlewareCors()),
  Layer.provide(ApiLive),
  Layer.provide(ApplicationLive),
  Layer.provide(NodeSdkLive),
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: PORT }))
);

// Configure logging level
const MainLive = ServerLive.pipe(
  Layer.provide(Logger.minimumLogLevel(LogLevel.Info))
);

// Launch the server
Effect.gen(function* () {
  yield* Layer.launch(MainLive);
}).pipe(NodeRuntime.runMain);
