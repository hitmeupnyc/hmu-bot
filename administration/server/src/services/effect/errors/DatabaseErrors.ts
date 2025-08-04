import { Data } from 'effect';

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
