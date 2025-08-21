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
  userAgent?: string;
  userId?: string;
}

export interface OperationMetrics {
  operation: string;
  duration: number;
  path: string;
  method: string;
  userId?: string;
}

export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  metrics: OperationMetrics;
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
  userAgent: req.get('User-Agent'),
  userId: req.session?.userId,
});

/**
 * Add observability to an Effect with consistent span attributes and timing
 */
export const withRequestObservability = <A, E, R>(
  spanName: string,
  req: Request
) => {
  const context = extractRequestContext(req);

  return (e: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    e
      .pipe(Effect.withSpan(spanName, { attributes: { context } }))
      .pipe(Effect.provide(NodeSdkLive));
};

/**
 * Higher-order function that wraps an operation with full observability
 * Returns both the result and the metrics for further processing
 */
export const withOperationTracking = <A, E, R>(
  operation: string,
  req: Request,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> => {
  const startTime = Date.now();
  const context = extractRequestContext(req);

  return effect.pipe(
    withRequestObservability(operation, req),
    Effect.tapBoth({
      onSuccess: (data) => {
        const duration = Date.now() - startTime;
        console.log({
          operation,
          duration,
          path: context.path,
          method: context.method,
          data,
        });
        return Effect.succeed(data);
      },
      onFailure: (error) => {
        const duration = Date.now() - startTime;
        console.log({
          operation,
          duration,
          path: context.path,
          method: context.method,
          error,
        });
        return Effect.fail(error);
      },
    })
  );
};

/**
 * Simple timing utility for non-Effect operations
 */
export const measureDuration = <T>(operation: () => T): [T, number] => {
  const startTime = Date.now();
  const result = operation();
  const duration = Date.now() - startTime;
  return [result, duration];
};
