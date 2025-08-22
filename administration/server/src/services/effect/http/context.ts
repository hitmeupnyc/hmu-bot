import { Session } from '../layers/AuthLayer';
/**
 * Context tags for HTTP request pipeline
 *
 * These tags define the types of data that can be provided and consumed
 * in the HTTP request processing pipeline using Effect's Context system.
 */

import { Context } from 'effect';
import type { NextFunction, Request, Response } from 'express';

export interface IExpress {
  req: Request;
  res: Response;
  next: NextFunction;
}
// Express request and response objects
export const Express = Context.GenericTag<IExpress>('@effect-http/Express');

// Parsed request data
export const ParsedBody = Context.GenericTag<'ParsedBody', unknown>(
  '@effect-http/ParsedBody'
);
export const ParsedQuery = Context.GenericTag<'ParsedQuery', unknown>(
  '@effect-http/ParsedQuery'
);
export const ParsedParams = Context.GenericTag<'ParsedParams', unknown>(
  '@effect-http/ParsedParams'
);

export const ActiveUser = Context.GenericTag<'ActiveUser', Session['user']>(
  '@effect-http/ActiveUser'
);
export const ActiveSession = Context.GenericTag<'ActiveSession', Session>(
  '@effect-http/ActiveSession'
);
