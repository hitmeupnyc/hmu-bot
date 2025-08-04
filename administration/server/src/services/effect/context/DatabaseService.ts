import Database from 'better-sqlite3';
import { Context, Effect } from 'effect';
import { Kysely } from 'kysely';
import type { DB as DatabaseSchema } from '../../../types/database';
import { DatabaseError, TransactionError } from '../errors/DatabaseErrors';

export interface DatabaseService {
  readonly query: <T>(
    fn: (db: Kysely<DatabaseSchema>) => Promise<T>
  ) => Effect.Effect<T, DatabaseError>;
  readonly querySync: <T>(fn: (db: Database.Database) => T) => Effect.Effect<T, DatabaseError>;
  readonly transaction: <T, E>(
    fn: (db: Kysely<DatabaseSchema>) => Effect.Effect<T, E>
  ) => Effect.Effect<T, E | TransactionError>;
}

export const DatabaseService = Context.GenericTag<DatabaseService>('DatabaseService');

export const makeDatabaseService = (
  db: Kysely<DatabaseSchema>,
  sqliteDb: Database.Database
): DatabaseService => ({
  query: <T>(fn: (db: Kysely<DatabaseSchema>) => Promise<T>) =>
    Effect.tryPromise({
      try: () => fn(db),
      catch: (error) =>
        new DatabaseError({
          message: `Database query failed: ${String(error)}`,
          cause: error,
        }),
    }),

  querySync: <T>(fn: (db: Database.Database) => T) =>
    Effect.try({
      try: () => fn(sqliteDb),
      catch: (error) =>
        new DatabaseError({
          message: `Sync database operation failed: ${String(error)}`,
          cause: error,
        }),
    }),

  transaction: <T, E>(fn: (db: Kysely<DatabaseSchema>) => Effect.Effect<T, E>) =>
    Effect.tryPromise({
      try: async () => {
        return await db.transaction().execute(async (trx) => {
          return await Effect.runPromise(fn(trx));
        });
      },
      catch: (error) =>
        new TransactionError({
          message: `Transaction failed: ${String(error)}`,
          operation: 'transaction',
        }),
    }),
});
