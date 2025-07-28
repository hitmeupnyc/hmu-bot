import Database from 'better-sqlite3'
import { SqliteDialect } from 'kysely'

export default {
  dialect: new SqliteDialect({
    database: new Database(
      process.env.DATABASE_PATH || './data/club.db'
    )
  }),
  out: './src/types/database.ts'
}