import { Data } from 'effect';

// Network
export class NotFoundError extends Data.TaggedError('NotFoundError')<{
  readonly id: string;
  readonly resource: string;
}> {}

export class UniqueError extends Data.TaggedError('UniqueError')<{
  readonly field: string;
  readonly value: string;
}> {}

// Database
export class DatabaseError extends Data.TaggedError('DatabaseError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class TransactionError extends Data.TaggedError('TransactionError')<{
  readonly message: string;
  readonly operation: string;
}> {}

export class ConnectionError extends Data.TaggedError('ConnectionError')<{
  readonly message: string;
  readonly path?: string;
}> {}

// Schema
export { ParseError } from 'effect/ParseResult';
