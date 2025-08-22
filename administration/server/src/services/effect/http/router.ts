/**
 * Effect Router - Functional API for Effect-based route handlers
 *
 * This module provides a functional wrapper around Express Router that
 * automatically handles Effect pipeline execution, error handling, and
 * response formatting.
 */

import { Cause, Effect, Exit, Layer } from 'effect';
import { Router as ExpressRouter } from 'express';
import type { NextFunction, Request, Response } from 'express';

import { AuditServiceLive } from '../AuditEffects';
import { AuthorizationService } from '../AuthorizationEffects';
import { EventServiceLive } from '../EventEffects';
import { Express } from './context';
import { AuthLive } from '../layers/AuthLayer';
import { DatabaseLive } from '../layers/DatabaseLayer';
import { FlagLive } from '../layers/FlagLayer';
import { MemberServiceLive } from '../MemberEffects';
import { transformError } from '../adapters/errorResponseBuilder';

// Application layer that provides all services to Effect pipelines
const ApplicationLive = Layer.mergeAll(
  DatabaseLive,
  MemberServiceLive,
  EventServiceLive,
  AuditServiceLive,
  FlagLive,
  AuthLive,
  AuthorizationService.Live
);

/**
 * Execute an Effect pipeline as an Express route handler
 */
const executeEffectPipeline = (
  req: Request,
  res: Response,
  next: NextFunction,
  pipeline: Effect.Effect<any, any, any>
) => {
  Effect.runPromiseExit(
    pipeline.pipe(
      Effect.provideService(Express, { req, res, next }),
      Effect.provide(ApplicationLive)
    )
  ).then((result) => {
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
  }).catch((error) => {
    const errorResponse = transformError(error);
    res.status(errorResponse.status).json(errorResponse.body);
  });
};

/**
 * Create an Effect-aware router with functional API
 * 
 * @returns Object with Express router and Effect-enabled route methods
 */
export const createEffectRouter = () => {
  const router = ExpressRouter();
  
  const effectRoute = (method: string) => (
    path: string,
    pipeline: Effect.Effect<any, any, any>
  ) => {
    router[method as keyof ExpressRouter](path, (req: Request, res: Response, next: NextFunction) => {
      executeEffectPipeline(req, res, next, pipeline);
    });
    return api;
  };
  
  const api = {
    /**
     * Access to the underlying Express router
     * Use this when exporting the router or mounting it in the main app
     */
    express: router,
    
    /**
     * Effect-enabled route methods
     * Each method takes a path and an Effect pipeline
     */
    get: effectRoute('get'),
    post: effectRoute('post'),
    put: effectRoute('put'),
    delete: effectRoute('delete'),
    patch: effectRoute('patch'),
    
    /**
     * Mount regular Express middleware (for non-Effect routes)
     */
    use: (pathOrMiddleware: string | Function, middleware?: Function) => {
      if (typeof pathOrMiddleware === 'string' && middleware) {
        router.use(pathOrMiddleware, middleware);
      } else if (typeof pathOrMiddleware === 'function') {
        router.use(pathOrMiddleware);
      }
      return api;
    }
  };
  
  return api;
};

/**
 * Type helper for Effect router instance
 */
export type EffectRouter = ReturnType<typeof createEffectRouter>;