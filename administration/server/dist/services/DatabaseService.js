"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class DatabaseService {
    static instance;
    db;
    constructor() {
        const dbPath = process.env.DATABASE_PATH || path_1.default.join(__dirname, '../../data/club.db');
        const dbDir = path_1.default.dirname(dbPath);
        if (!fs_1.default.existsSync(dbDir)) {
            fs_1.default.mkdirSync(dbDir, { recursive: true });
        }
        this.db = new better_sqlite3_1.default(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');
    }
    static getInstance() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }
    initialize() {
        try {
            const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
            if (tables.length > 0) {
                console.log('✅ Database already initialized, skipping schema creation');
                return;
            }
            const schemaPath = path_1.default.join(__dirname, '../../schema.sql');
            if (!fs_1.default.existsSync(schemaPath)) {
                throw new Error(`Schema file not found at ${schemaPath}`);
            }
            const schema = fs_1.default.readFileSync(schemaPath, 'utf8');
            const statements = schema.split(';').filter(stmt => stmt.trim());
            for (const statement of statements) {
                if (statement.trim()) {
                    this.db.exec(statement + ';');
                }
            }
            console.log('✅ Database initialized successfully');
        }
        catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }
    getDatabase() {
        return this.db;
    }
    close() {
        this.db.close();
    }
    prepare(sql) {
        return this.db.prepare(sql);
    }
    transaction(fn) {
        return this.db.transaction(fn)();
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=DatabaseService.js.map