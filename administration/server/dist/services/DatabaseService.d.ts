import Database from 'better-sqlite3';
export declare class DatabaseService {
    private static instance;
    private db;
    private constructor();
    static getInstance(): DatabaseService;
    initialize(): void;
    getDatabase(): Database.Database;
    close(): void;
    prepare(sql: string): Database.Statement;
    transaction<T>(fn: () => T): T;
}
//# sourceMappingURL=DatabaseService.d.ts.map