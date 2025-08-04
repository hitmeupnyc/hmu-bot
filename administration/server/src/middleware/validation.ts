import { NextFunction, Request, Response } from 'express';
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

// Comprehensive validation middleware that validates all parts of the request
interface ValidationRules<TBody = any, TQuery = any, TParams = any> {
  body?: z.ZodSchema<TBody>;
  query?: z.ZodSchema<TQuery>;
  params?: z.ZodSchema<TParams>;
}

export const validate = <TBody = any, TQuery = any, TParams = any>(
  rules: ValidationRules<TBody, TQuery, TParams>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: Array<{ field: string; message: string }> = [];

    /**
     * Validate the body
     */
    try {
      if (rules.body) {
        req.body = rules.body.parse(req.body);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        errors.push(
          ...error.issues.map((err) => ({
            field: `body.${err.path.join('.')}`,
            message: err.message,
          }))
        );
      }
    }

    /**
     * Validate the query
     */
    try {
      if (rules.query) {
        req.query = rules.query.parse(req.query) as any;
      }
    } catch (error) {
      if (error instanceof ZodError) {
        errors.push(
          ...error.issues.map((err) => ({
            field: `query.${err.path.join('.')}`,
            message: err.message,
          }))
        );
      }
    }

    /**
     * Validate the params
     */
    try {
      if (rules.params) {
        req.params = rules.params.parse(req.params) as any;
      }
    } catch (error) {
      if (error instanceof ZodError) {
        errors.push(
          ...error.issues.map((err) => ({
            field: `params.${err.path.join('.')}`,
            message: err.message,
          }))
        );
      }
    }

    if (errors.length > 0) {
      next(new ValidationError(errors));
    } else {
      next();
    }
  };
};
