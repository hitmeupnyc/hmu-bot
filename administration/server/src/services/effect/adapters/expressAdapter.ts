import { Cause, Effect, Exit, Layer } from 'effect';
import type { NextFunction, Request, Response } from 'express';

import { transformError } from './errorResponseBuilder';
import { withRequestObservability } from './observabilityUtils';

import { AuditServiceLive, IAuditService } from '../AuditEffects';
import { EventServiceLive, IEventService } from '../EventEffects';
import { Express } from '../http/context';
import { DatabaseLive, IDatabaseService } from '../layers/DatabaseLayer';
import { FlagLive, IFlag } from '../layers/FlagLayer';
import { IMemberService, MemberServiceLive } from '../MemberEffects';

// Create a comprehensive application layer that includes all services
// DatabaseLive provides DatabaseService directly
// Other services are built on top of DatabaseLive
const ApplicationLive = Layer.mergeAll(
  DatabaseLive,
  MemberServiceLive,
  EventServiceLive,
  AuditServiceLive,
  FlagLive
);

/**
 * Convert an Effect pipeline to an Express middleware function
 * Injects Express Request/Response and metadata into Effect context
 */
export const effectToExpress =
  <A, E>(
    effect: Effect.Effect<
      A,
      E,
      IDatabaseService | IMemberService | IEventService | IAuditService | IFlag
    >
  ) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await Effect.runPromiseExit(
        effect.pipe(
          Effect.provideService(Express, { req, res, next }),
          Effect.provide(ApplicationLive)
        ) as Effect.Effect<A, E, never>
      );

      Exit.match(result, {
        onFailure: (cause) => {
          const error = Cause.failureOption(cause);

          if (error._tag === 'Some') {
            // TODO: This whole function can probably be made into a pipeline with error tag matching.
            const errorResponse = transformError(error.value);
            res.status(errorResponse.status).json(errorResponse.body);
          } else {
            // Handle defects or interruptions
            const errorResponse = transformError(new Error('Operation failed'));
            res.status(errorResponse.status).json(errorResponse.body);
          }
        },
        onSuccess: (value) => {
          // Only send response if it hasn't been sent already
          if (!res.headersSent) {
            res.json(value);
          }
        },
      });
    } catch (error) {
      const errorResponse = transformError(error);
      res.status(errorResponse.status).json(errorResponse.body);
    }
  };

/**
 * Legacy effectToExpress for backwards compatibility
 * @deprecated Use the new pipeline-based effectToExpress instead
 */
export const legacyEffectToExpress =
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
            const errorResponse = transformError(error.value);
            res.status(errorResponse.status).json(errorResponse.body);
          } else {
            // Handle defects or interruptions
            const errorResponse = transformError(new Error('Operation failed'));
            res.status(errorResponse.status).json(errorResponse.body);
          }
        },
        onSuccess: (value) => {
          // Only send response if it hasn't been sent already
          if (!res.headersSent) {
            res.json(value);
          }
        },
      });
    } catch (error) {
      const errorResponse = transformError(error);
      res.status(errorResponse.status).json(errorResponse.body);
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
