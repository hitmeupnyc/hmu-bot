import { NodeSdk } from '@effect/opentelemetry/index';
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
} from '@opentelemetry/sdk-trace-base';
import { Effect } from 'effect';
import { Request } from 'express';

export interface RequestContext {
  method: string;
  path: string;
  userId?: string;
  sessionId?: string;
}

// Set up tracing with the OpenTelemetry SDK
const NodeSdkLive = NodeSdk.layer(() => ({
  resource: { serviceName: 'example' },
  // Export span data to the console
  spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter()),
}));

/**
 * Extract request context for consistent logging and spans
 */
export const extractRequestContext = (req: Request): RequestContext => ({
  method: req.method,
  path: req.path,
  userId: req.session?.userId,
  sessionId: req.session?.id,
});

/**
 * Add observability to an Effect with consistent span attributes and timing
 */
export const withRequestObservability = <A, E, R>(
  spanName: string,
  req: Request
) => withObservability<A, E, R>(spanName, extractRequestContext(req));

export const withObservability =
  <A, E, R>(spanName: string, attributes?: Record<string, any>) =>
  (e: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    e
      .pipe(Effect.withSpan(spanName, { attributes }))
      .pipe(Effect.provide(NodeSdkLive));
