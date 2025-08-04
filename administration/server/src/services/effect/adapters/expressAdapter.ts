import { Cause, Effect, Exit } from 'effect';
import type { NextFunction, Request, Response } from 'express';
import { ConnectionError, DatabaseError, TransactionError } from '../errors/DatabaseErrors';
import { EventNotFound, EventValidationError } from '../errors/EventErrors';
import { EmailAlreadyExists, MemberNotFound, MemberValidationError } from '../errors/MemberErrors';
import { DatabaseLive } from '../layers/DatabaseLayer';

/**
 * Convert Effect errors to Express-compatible errors
 */
const toExpressError = (error: unknown): Error => {
  if (error instanceof MemberNotFound) {
    const err = new Error(`Member not found: ${error.memberId}`);
    (err as any).status = 404;
    return err;
  }

  if (error instanceof EmailAlreadyExists) {
    const err = new Error(`Email already exists: ${error.email}`);
    (err as any).status = 409;
    return err;
  }

  if (error instanceof MemberValidationError || error instanceof EventValidationError) {
    const err = new Error(`Validation error in ${error.field}: ${error.message}`);
    (err as any).status = 400;
    return err;
  }

  if (error instanceof EventNotFound) {
    const err = new Error(`Event not found: ${error.eventId}`);
    (err as any).status = 404;
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
        effectFn(req, res).pipe(Effect.provide(DatabaseLive)) as Effect.Effect<A, E, never>
      );

      Exit.match(result, {
        onFailure: (cause) => {
          const error = Cause.failureOption(cause);
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
 * Helper to extract common request patterns
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

/**
 * Audit info extractor for routes that need it
 */
export const extractAuditInfo = (
  req: Request
): Effect.Effect<{ sessionId: string; userIp: string }, Error> =>
  Effect.try({
    try: () => ({
      sessionId: (req as any).session?.id || 'anonymous',
      userIp: req.ip || (req as any).connection?.remoteAddress || 'unknown',
    }),
    catch: (error) => new Error(`Failed to extract audit info: ${String(error)}`),
  });
