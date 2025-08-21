import { Cause, Effect, Exit, Layer } from 'effect';
import type { NextFunction, Request, Response } from 'express';
import { AuditServiceLive } from '../AuditEffects';
import { EventServiceLive } from '../EventEffects';
import { DatabaseLive } from '../layers/DatabaseLayer';
import { MemberServiceLive } from '../MemberEffects';
import { transformError } from './errorResponseBuilder';
import { withRequestObservability } from './observabilityUtils';

// Create a comprehensive application layer that includes all services
const ApplicationLive = Layer.mergeAll(
  DatabaseLive,
  MemberServiceLive,
  EventServiceLive,
  AuditServiceLive
);

/**
 * Convert an Effect to an Express middleware function
 */
export const effectToExpress =
  <A, E>(effectFn: (req: Request, res: Response) => Effect.Effect<A, E, any>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await Effect.runPromiseExit(
        effectFn(req, res).pipe(
          withRequestObservability('express-route', req),
          Effect.provide(ApplicationLive)
        ) as Effect.Effect<A, E, never>
      );

      Exit.match(result, {
        onFailure: (cause) => {
          const error = Cause.failureOption(cause);

          if (error._tag === 'Some') {
            next(transformError(error.value));
          } else {
            // Handle defects or interruptions
            next(transformError(new Error('Operation failed')));
          }
        },
        onSuccess: res.json,
      });
    } catch (error) {
      next(transformError(error));
    }
  };

/**
 * Helper to extract common request patterns. This is an antipattern! It should be refactored into a schema validator instead!
 */
export const extractId = (req: Request): Effect.Effect<number, Error> =>
  Effect.try({
    try: () => {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        throw new Error('Invalid ID parameter');
      }
      return id;
    },
    catch: (error) => new Error(`Invalid ID: ${String(error)}`),
  });

export const extractBody = <T>(req: Request): Effect.Effect<T, Error> =>
  Effect.try({
    try: () => {
      if (!req.body) {
        throw new Error('Request body is required');
      }
      return req.body as T;
    },
    catch: (error) => new Error(`Invalid request body: ${String(error)}`),
  });

export const extractQuery = <T>(req: Request): Effect.Effect<T, Error> =>
  Effect.try({
    try: () => req.query as T,
    catch: (error) => new Error(`Invalid query parameters: ${String(error)}`),
  });
