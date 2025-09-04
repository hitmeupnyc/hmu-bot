import { HttpApiSchema } from '@effect/platform/index';
import { Schema } from 'effect';

export class UnrecoverableError extends Schema.TaggedError<UnrecoverableError>()(
  'UnrecoverableError',
  { message: Schema.String, stack: Schema.String, attributes: Schema.Any },
  HttpApiSchema.annotations({ status: 500 })
) {}

// Network
export class NotFoundError extends Schema.TaggedError<NotFoundError>()(
  'NotFoundError',
  { id: Schema.String, resource: Schema.String },
  HttpApiSchema.annotations({ status: 404 })
) {}

export class UniqueError extends Schema.TaggedError<UniqueError>()(
  'UniqueError',
  { field: Schema.String, value: Schema.String },
  HttpApiSchema.annotations({ status: 409 })
) {}

// Database
export class DatabaseError extends Schema.TaggedError<DatabaseError>()(
  'DatabaseError',
  { message: Schema.String, cause: Schema.optional(Schema.Any) },
  HttpApiSchema.annotations({ status: 500 })
) {}

export class TransactionError extends Schema.TaggedError<TransactionError>()(
  'TransactionError',
  { message: Schema.String, operation: Schema.String },
  HttpApiSchema.annotations({ status: 500 })
) {}

export class ConnectionError extends Schema.TaggedError<ConnectionError>()(
  'ConnectionError',
  { message: Schema.String, path: Schema.optional(Schema.String) },
  HttpApiSchema.annotations({ status: 500 })
) {}

// Schema
export class ParseError extends Schema.TaggedError<ParseError>()(
  'ParseError',
  { message: Schema.String },
  HttpApiSchema.annotations({ status: 400 })
) {}
