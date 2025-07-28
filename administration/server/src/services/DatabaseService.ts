import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { Database as DatabaseSchema } from '../types/database';
import { MigrationProvider } from './MigrationProvider';

export class DatabaseService {
  private static instance: DatabaseService;
  private _db: Kysely<DatabaseSchema>;
  private _sqliteDb: Database.Database;
  private _migrationProvider: MigrationProvider;

  private constructor() {
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/club.db');
    
    // Ensure data directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Create the better-sqlite3 instance
    this._sqliteDb = new Database(dbPath);
    this._sqliteDb.pragma('journal_mode = WAL');
    this._sqliteDb.pragma('foreign_keys = ON');

    // Create Kysely instance with SqliteDialect
    this._db = new Kysely<DatabaseSchema>({
      dialect: new SqliteDialect({
        database: this._sqliteDb,
      }),
    });

    // Initialize migration provider
    this._migrationProvider = new MigrationProvider(this._db);
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public get db(): Kysely<DatabaseSchema> {
    return this._db;
  }

  public get sqliteDb(): Database.Database {
    return this._sqliteDb;
  }

  public async initialize(): Promise<void> {
    try {
      console.log('🔄 Running database migrations...');
      await this._migrationProvider.migrateToLatest();
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  public getDatabase(): Kysely<DatabaseSchema> {
    return this._db;
  }

  public async close(): Promise<void> {
    await this._db.destroy();
    this._sqliteDb.close();
  }

  // Transaction helper
  public async transaction<T>(fn: (trx: Kysely<DatabaseSchema>) => Promise<T>): Promise<T> {
    return await this._db.transaction().execute(fn);
  }

  // Legacy compatibility methods for gradual migration
  public prepare(sql: string): Database.Statement {
    return this._sqliteDb.prepare(sql);
  }

  public legacyTransaction<T>(fn: () => T): T {
    return this._sqliteDb.transaction(fn)();
  }

  // Migration management methods
  public async migrateUp(): Promise<void> {
    await this._migrationProvider.migrateToLatest();
  }

  public async migrateDown(): Promise<void> {
    await this._migrationProvider.migrateDown();
  }

  public async getMigrationStatus() {
    return await this._migrationProvider.getMigrationStatus();
  }
}