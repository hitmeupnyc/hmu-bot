import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export class DatabaseService {
  private static instance: DatabaseService;
  private _db: Database.Database;

  private constructor() {
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/club.db');
    
    // Ensure data directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this._db = new Database(dbPath);
    this._db.pragma('journal_mode = WAL');
    this._db.pragma('foreign_keys = ON');
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public get db(): Database.Database {
    return this._db;
  }

  public initialize(): void {
    try {
      // Check if database is already initialized
      const tables = this._db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      
      if (tables.length > 0) {
        console.log('✅ Database already initialized, skipping schema creation');
        return;
      }

      // Read and execute schema
      const schemaPath = path.join(__dirname, '../../schema.sql');
      
      if (!fs.existsSync(schemaPath)) {
        throw new Error(`Schema file not found at ${schemaPath}`);
      }
      
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // Split by semicolon and execute each statement
      const statements = schema.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          this._db.exec(statement + ';');
        }
      }
      
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  public getDatabase(): Database.Database {
    return this._db;
  }

  public close(): void {
    this._db.close();
  }

  // Utility methods for common operations
  public prepare(sql: string): Database.Statement {
    return this._db.prepare(sql);
  }

  public transaction<T>(fn: () => T): T {
    return this._db.transaction(fn)();
  }
}