import { NodeSdk } from '@effect/opentelemetry/index';
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
} from '@opentelemetry/sdk-trace-base';
import { HttpServerRequest } from '@effect/platform';
import { Effect, Layer } from 'effect';

export interface RequestContext {
  method: string;
  path: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

// Set up tracing with the OpenTelemetry SDK
export const NodeSdkLive = NodeSdk.layer(() => ({
  resource: { serviceName: 'club-management-api' },
  // Export span data to the console
  spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter()),
}));

/**
 * Extract request context from HttpServerRequest for consistent logging and spans
 */
export const extractHttpRequestContext = (
  request: HttpServerRequest
): Effect.Effect<RequestContext, never, never> =>
  Effect.gen(function* () {
    const method = request.method;
    const path = request.url;
    const headers = request.headers;
    
    return {
      method,
      path,
      requestId: headers['x-request-id'] || crypto.randomUUID(),
      userId: headers['x-user-id'], // Will be populated by auth middleware
      sessionId: headers['x-session-id'], // Will be populated by auth middleware
    };
  });

/**
 * Add observability to an Effect with HttpApi request context
 */
export const withHttpRequestObservability = <A, E, R>(
  spanName: string,
  request: HttpServerRequest
) => (effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  Effect.gen(function* () {
    const context = yield* extractHttpRequestContext(request);
    return yield* effect.pipe(
      Effect.withSpan(spanName, { 
        attributes: {
          'http.method': context.method,
          'http.url': context.path,
          'http.request_id': context.requestId,
          'user.id': context.userId,
          'session.id': context.sessionId,
        }
      })
    );
  });

/**
 * Generic observability wrapper for any Effect
 */
export const withObservability =
  <A, E, R>(spanName: string, attributes?: Record<string, any>) =>
  (effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    effect.pipe(
      Effect.withSpan(spanName, { attributes })
    );

/**
 * Add database operation observability
 */
export const withDatabaseObservability = <A, E, R>(
  operation: string,
  table?: string,
  recordId?: string | number
) => (effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  effect.pipe(
    Effect.withSpan(`db.${operation}`, {
      attributes: {
        'db.operation': operation,
        'db.table': table,
        'db.record_id': recordId?.toString(),
      }
    })
  );

/**
 * Add service layer observability
 */
export const withServiceObservability = <A, E, R>(
  serviceName: string,
  operation: string,
  entityId?: string | number
) => (effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  effect.pipe(
    Effect.withSpan(`service.${serviceName}.${operation}`, {
      attributes: {
        'service.name': serviceName,
        'service.operation': operation,
        'entity.id': entityId?.toString(),
      }
    })
  );
