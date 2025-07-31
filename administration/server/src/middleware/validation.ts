import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export class ValidationError extends Error {
  public statusCode: number;
  public errors: Array<{ field: string; message: string }>;

  constructor(errors: Array<{ field: string; message: string }>) {
    super('Validation failed');
    this.statusCode = 400;
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

export const validateBody = <T>(schema: z.ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        next(new ValidationError(errors));
      } else {
        next(error);
      }
    }
  };
};

export const validateQuery = <T>(schema: z.ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.query);
      req.query = validatedData as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        next(new ValidationError(errors));
      } else {
        next(error);
      }
    }
  };
};

export const validateParams = <T>(schema: z.ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.params);
      req.params = validatedData as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        next(new ValidationError(errors));
      } else {
        next(error);
      }
    }
  };
};

// Comprehensive validation middleware that validates all parts of the request
export interface ValidationRules<TBody = any, TQuery = any, TParams = any> {
  body?: z.ZodSchema<TBody>;
  query?: z.ZodSchema<TQuery>;
  params?: z.ZodSchema<TParams>;
}

export const validate = <TBody = any, TQuery = any, TParams = any>(
  rules: ValidationRules<TBody, TQuery, TParams>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: Array<{ field: string; message: string }> = [];

    try {
      if (rules.body) {
        req.body = rules.body.parse(req.body);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        errors.push(...error.issues.map(err => ({
          field: `body.${err.path.join('.')}`,
          message: err.message
        })));
      }
    }

    try {
      if (rules.query) {
        req.query = rules.query.parse(req.query) as any;
      }
    } catch (error) {
      if (error instanceof ZodError) {
        errors.push(...error.issues.map(err => ({
          field: `query.${err.path.join('.')}`,
          message: err.message
        })));
      }
    }

    try {
      if (rules.params) {
        req.params = rules.params.parse(req.params) as any;
      }
    } catch (error) {
      if (error instanceof ZodError) {
        errors.push(...error.issues.map(err => ({
          field: `params.${err.path.join('.')}`,
          message: err.message
        })));
      }
    }

    if (errors.length > 0) {
      next(new ValidationError(errors));
    } else {
      next();
    }
  };
};