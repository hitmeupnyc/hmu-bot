import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';
import { ValidationError } from './validation';
import logger from '../utils/logger';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}


interface ErrorResponse extends ApiResponse {
  code?: string;
  errors?: Array<{ field: string; message: string }>;
  requestId?: string;
}

export const errorHandler = (
  error: Error | AppError | ValidationError,
  req: Request,
  res: Response<ErrorResponse>,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal server error';
  let code: string | undefined;
  let errors: Array<{ field: string; message: string }> | undefined;

  // Generate unique request ID for tracking
  const requestId = req.headers['x-request-id'] as string || 
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Check if error has a status property (set by effectToExpress adapter)
  if ((error as any).status) {
    statusCode = (error as any).status;
    message = error.message;
  } else if (error instanceof ValidationError) {
    statusCode = error.statusCode;
    message = error.message;
    code = 'VALIDATION_ERROR';
    errors = error.errors;
  } else if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
  } else if (error.name === 'SqliteError') {
    statusCode = 400;
    message = 'Database operation failed';
    code = 'DATABASE_ERROR';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid data format';
    code = 'INVALID_FORMAT';
  } else if (error.message.includes('UNIQUE constraint')) {
    statusCode = 409;
    message = 'Resource already exists';
    code = 'DUPLICATE_RESOURCE';
  } else if (error.message.includes('FOREIGN KEY constraint')) {
    statusCode = 400;
    message = 'Invalid reference to related resource';
    code = 'INVALID_REFERENCE';
  }

  // Log error with appropriate level
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel]('API Error', {
    requestId,
    message: error.message,
    stack: error.stack,
    statusCode,
    code,
    path: req.path,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString(),
    ...(errors && { validationErrors: errors })
  });

  const response: ErrorResponse = {
    success: false,
    error: message,
    code,
    requestId,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack,
      originalError: error.message 
    })
  };

  res.status(statusCode).json(response);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};