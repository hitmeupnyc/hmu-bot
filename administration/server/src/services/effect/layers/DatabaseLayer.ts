import Database from 'better-sqlite3';
import { Context, Effect, Layer } from 'effect';
import { withSpan } from 'effect/Effect';
import fs from 'fs';
import { Kysely, SqliteDialect } from 'kysely';
import path from 'path';
import { TransactionError, UnrecoverableError } from '~/api/errors';
import type { DB as DatabaseSchema } from '~/types';

export interface IDatabaseService {
  readonly obQuery: <T>(
    name: string,
    fn: (db: Kysely<DatabaseSchema>) => Promise<T>
  ) => Effect.Effect<T, UnrecoverableError, never>;
  readonly query: <T>(
    fn: (db: Kysely<DatabaseSchema>) => Promise<T>
  ) => Effect.Effect<T, UnrecoverableError, never>;
  readonly querySync: <T>(
    fn: (db: Database.Database) => T
  ) => Effect.Effect<T, UnrecoverableError, never>;
  readonly transaction: <T, E>(
    fn: (db: Kysely<DatabaseSchema>) => Effect.Effect<T, E>
  ) => Effect.Effect<T, E | TransactionError | UnrecoverableError, never>;
}

export const DatabaseService =
  Context.GenericTag<IDatabaseService>('DatabaseService');

const Crash = Effect.catchAll((error) => {
  if (error instanceof Error) {
    return Effect.fail(
      new UnrecoverableError({
        message: 'Database error',
        stack: error.stack || '',
        attributes: error,
      })
    );
  }
  return Effect.die(error);
});

export const DatabaseLive = Layer.effect(
  DatabaseService,
  Effect.gen(function* () {
    const dbPath =
      process.env.DATABASE_PATH || path.join(process.cwd(), 'data/club.db');

    // Ensure data directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Create the better-sqlite3 instance
    const sqliteDb = yield* (() => {
      try {
        const dbInstance = new Database(dbPath);
        dbInstance.pragma('journal_mode = WAL');
        dbInstance.pragma('foreign_keys = ON');
        return Effect.succeed(dbInstance);
      } catch (_) {
        return Effect.die('Failed to connect to sqlite');
      }
    })();

    // Create Kysely instance with SqliteDialect
    const db = yield* (() => {
      try {
        return Effect.succeed(
          new Kysely<DatabaseSchema>({
            dialect: new SqliteDialect({ database: sqliteDb }),
          })
        );
      } catch (_) {
        return Effect.die('Failed to create Kysely instance');
      }
    })();

    // TODO: Add more precise error handling https://sqlite.org/rescode.html
    // There are a number of errors that don't indicate actual failure, or
    // are recoverable. e.g. SQLITE_ABORT/SQLITE_INTERRUPT, or SQLITE_BUSY
    // which could resolve after a rety.
    return {
      obQuery: <T>(
        name: string,
        fn: (db: Kysely<DatabaseSchema>) => Promise<T>
      ): Effect.Effect<T, UnrecoverableError, never> =>
        Effect.tryPromise(() => fn(db)).pipe(Crash, withSpan(`db.${name}`)),

      query: <T>(
        fn: (db: Kysely<DatabaseSchema>) => Promise<T>
      ): Effect.Effect<T, UnrecoverableError, never> =>
        Effect.tryPromise(() => fn(db)).pipe(Crash, withSpan(`db.query`)),

      querySync: <T>(
        fn: (db: Database.Database) => T
      ): Effect.Effect<T, UnrecoverableError, never> =>
        Effect.try(() => fn(sqliteDb)).pipe(Crash, withSpan(`db.querySync`)),

      transaction: <T, E>(
        fn: (db: Kysely<DatabaseSchema>) => Effect.Effect<T, E>
      ): Effect.Effect<T, E | TransactionError | UnrecoverableError, never> =>
        Effect.tryPromise(() =>
          db.transaction().execute((trx) => Effect.runPromise(fn(trx)))
        ).pipe(Crash, withSpan(`db.transaction`)),
    };
  })
);

export let db_DO_NOT_USE_WITHOUT_PRIOR_AUTHORIZATION: Kysely<DatabaseSchema>;

const extractKysely = Effect.gen(function* () {
  const dbService = yield* DatabaseService;
  const innerDb = yield* dbService.query((db) => Promise.resolve(db));
  return innerDb;
}).pipe(Effect.provide(DatabaseLive));

Effect.runPromise(
  extractKysely as Effect.Effect<Kysely<DatabaseSchema>, never, never>
).then((db) => {
  db_DO_NOT_USE_WITHOUT_PRIOR_AUTHORIZATION = db;
});
