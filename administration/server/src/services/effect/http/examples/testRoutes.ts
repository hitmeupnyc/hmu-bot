/**
 * Simple test routes to verify Effect HTTP pipeline functionality
 */

import { Effect, pipe, Schema } from 'effect';
import { Router } from 'express';
import { effectToExpress } from '../../adapters/expressAdapter';
import { 
  parseQuery, 
  parseParams,
  formatOutput,
  successResponse,
  IdParamSchema,
  PaginationSchema
} from '../index';
import { useParsedParams, useParsedQuery } from '../parsers';

const router = Router();

/**
 * GET /test - Simple test endpoint without authentication
 */
router.get(
  '/test',
  effectToExpress(
    pipe(
      Effect.succeed({ message: 'Effect HTTP pipeline is working!', timestamp: new Date().toISOString() }),
      successResponse('Test successful')
    )
  )
);

/**
 * GET /test/params/:id - Test parameter parsing
 */
router.get(
  '/test/params/:id',
  effectToExpress(
    pipe(
      parseParams(IdParamSchema),
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const { id } = yield* useParsedParams<{ id: number }>();
          return { 
            message: 'Parameter parsing works!', 
            parsedId: id, 
            idType: typeof id,
            timestamp: new Date().toISOString() 
          };
        })
      ),
      successResponse('Parameter parsing successful')
    )
  )
);

/**
 * GET /test/query - Test query parameter parsing
 */
router.get(
  '/test/query',
  effectToExpress(
    pipe(
      parseQuery(PaginationSchema),
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const query = yield* useParsedQuery<{ page: number; limit: number }>();
          return {
            message: 'Query parsing works!',
            parsedQuery: query,
            timestamp: new Date().toISOString()
          };
        })
      ),
      successResponse('Query parsing successful')
    )
  )
);

/**
 * GET /test/schema - Test schema formatting
 */
const TestSchema = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  active: Schema.Boolean,
  createdAt: Schema.DateFromString
});

router.get(
  '/test/schema',
  effectToExpress(
    pipe(
      Effect.succeed({
        id: 123,
        name: 'Test Item',
        active: true,
        createdAt: new Date()
      }),
      formatOutput(TestSchema)
    )
  )
);

export { router as testRoutes };