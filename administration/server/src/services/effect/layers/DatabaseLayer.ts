import Database from 'better-sqlite3';
import { Effect, Layer } from 'effect';
import fs from 'fs';
import { Kysely, SqliteDialect } from 'kysely';
import path from 'path';
import type { DB as DatabaseSchema } from '../../../types';
import {
  DatabaseService,
  makeDatabaseService,
} from '../context/DatabaseService';
import { ConnectionError } from '../errors/DatabaseErrors';

export const DatabaseLive = Layer.effect(
  DatabaseService,
  Effect.gen(function* () {
    const dbPath =
      process.env.DATABASE_PATH ||
      path.join(__dirname, '../../../../data/club.db');

    // Ensure data directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Create the better-sqlite3 instance
    const sqliteDb = yield* Effect.try({
      try: () => {
        const db = new Database(dbPath);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        return db;
      },
      catch: (error) =>
        new ConnectionError({
          message: `Failed to create SQLite connection: ${String(error)}`,
          path: dbPath,
        }),
    });

    // Create Kysely instance with SqliteDialect
    const db = yield* Effect.try({
      try: () =>
        new Kysely<DatabaseSchema>({
          dialect: new SqliteDialect({
            database: sqliteDb,
          }),
        }),
      catch: (error) =>
        new ConnectionError({
          message: `Failed to create Kysely instance: ${String(error)}`,
        }),
    });

    return makeDatabaseService(db, sqliteDb);
  })
);
