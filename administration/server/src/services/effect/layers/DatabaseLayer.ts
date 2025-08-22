import Database from 'better-sqlite3';
import { Context, Effect, Layer } from 'effect';
import fs from 'fs';
import { Kysely, SqliteDialect } from 'kysely';
import path from 'path';
import type { DB as DatabaseSchema } from '~/types';
import { TransactionError } from '../errors/CommonErrors';

export interface IDatabaseService {
  readonly query: <T>(
    fn: (db: Kysely<DatabaseSchema>) => Promise<T>
  ) => Effect.Effect<T, never, never>;
  readonly querySync: <T>(
    fn: (db: Database.Database) => T
  ) => Effect.Effect<T, never, never>;
  readonly transaction: <T, E>(
    fn: (db: Kysely<DatabaseSchema>) => Effect.Effect<T, E>
  ) => Effect.Effect<T, E | TransactionError, never>;
}

export const DatabaseService =
  Context.GenericTag<IDatabaseService>('DatabaseService');

const Crash = Effect.catchAll(Effect.die);

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
        const db = new Database(dbPath);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        return Effect.succeed(db);
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

    return {
      query: (fn) => Effect.tryPromise(() => fn(db)).pipe(Crash),

      querySync: <T>(fn: (db: Database.Database) => T) =>
        Effect.try(() => fn(sqliteDb)).pipe(Crash),

      transaction: <T, E>(
        fn: (db: Kysely<DatabaseSchema>) => Effect.Effect<T, E>
      ) =>
        Effect.tryPromise(() =>
          db.transaction().execute((trx) => Effect.runPromise(fn(trx)))
        ).pipe(Crash),
    };
  })
);
