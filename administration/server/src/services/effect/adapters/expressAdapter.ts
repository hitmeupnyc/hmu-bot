import { Cause, Effect, Exit, Layer } from 'effect';
import type { NextFunction, Request, Response } from 'express';
import { AuditServiceLive } from '../AuditEffects';
import {
  ConnectionError,
  DatabaseError,
  NotFoundError,
  ParseError,
  TransactionError,
  UniqueError,
} from '../errors/CommonErrors';
import { EventServiceLive } from '../EventEffects';
import { FlagError } from '../FlagService';
import { DatabaseLive } from '../layers/DatabaseLayer';
import { MemberServiceLive } from '../MemberEffects';

// Create a comprehensive application layer that includes all services
const ApplicationLive = Layer.mergeAll(
  DatabaseLive,
  MemberServiceLive,
  EventServiceLive,
  AuditServiceLive
);

/**
 * Convert Effect errors to Express-compatible errors
 */
const toExpressError = (error: unknown): Error => {
  if (error instanceof NotFoundError) {
    const err = new Error(`Not found: ${error.id}#${error.resource}`);
    (err as any).status = 404;
    return err;
  }

  if (error instanceof UniqueError) {
    const err = new Error(
      `Email already exists: ${error.field}=${error.value}`
    );
    (err as any).status = 409;
    return err;
  }

  if (error instanceof ParseError) {
    const err = new Error(`Validation error: ${error.message}`);
    (err as any).status = 400;
    return err;
  }

  if (error instanceof FlagError) {
    // Handle specific flag error cases
    if (error.message.includes('not found')) {
      const err = new Error(error.message);
      (err as any).status = 404;
      return err;
    }

    // Handle validation errors
    if (
      error.message.includes('invalid') ||
      error.message.includes('required')
    ) {
      const err = new Error(error.message);
      (err as any).status = 400;
      return err;
    }

    // Default flag error
    const err = new Error(error.message);
    (err as any).status = 500;
    return err;
  }

  if (
    error instanceof DatabaseError ||
    error instanceof ConnectionError ||
    error instanceof TransactionError
  ) {
    const err = new Error(`Database error: ${error.message}`);
    (err as any).status = 500;
    return err;
  }

  // Generic error handling
  const err = new Error(String(error));
  (err as any).status = 500;
  return err;
};

/**
 * Convert an Effect to an Express middleware function
 */
export const effectToExpress =
  <A, E>(effectFn: (req: Request, res: Response) => Effect.Effect<A, E, any>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await Effect.runPromiseExit(
        effectFn(req, res).pipe(
          Effect.provide(ApplicationLive)
        ) as Effect.Effect<A, E, never>
      );

      Exit.match(result, {
        onFailure: (cause) => {
          const error = Cause.failureOption(cause);
          console.error(cause);
          if (error._tag === 'Some') {
            next(toExpressError(error.value));
          } else {
            // Handle defects or interruptions
            next(new Error('Operation failed'));
          }
        },
        onSuccess: (value) => {
          res.json(value);
        },
      });
    } catch (error) {
      next(toExpressError(error));
    }
  };

/**
 * Helper to create an Effect from Express request data
 */
export const withRequestData =
  <T>(extractor: (req: Request) => T) =>
  (req: Request): Effect.Effect<T, never> =>
    Effect.succeed(extractor(req));

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
