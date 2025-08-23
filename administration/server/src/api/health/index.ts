/**
 * Health Check API endpoints
 * Migrated from Express routes to @effect/platform HttpApi
 */

import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpServerRequest,
} from "@effect/platform"
import { Effect, Schema } from "effect"
import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import { DatabaseService } from "~/services/effect/layers/DatabaseLayer"

// Response schemas
const HealthStatusSchema = Schema.Struct({
  status: Schema.Literal("healthy", "configuration_issues"),
  timestamp: Schema.String,
  version: Schema.String,
  database: Schema.String,
  environment: Schema.String,
  debug: Schema.optional(Schema.Any)
})

const EnvStatusSchema = Schema.Struct({
  status: Schema.Literal("ok", "configuration_issues"),
  timestamp: Schema.String,
  environment: Schema.Struct({
    values: Schema.Record({ key: Schema.String, value: Schema.Any }),
    required: Schema.Record({ key: Schema.String, value: Schema.Boolean }),
    optional: Schema.Record({ key: Schema.String, value: Schema.Boolean }),
    issues: Schema.Array(Schema.String)
  }),
  database: Schema.Any
})

// Health check group
export const healthGroup = HttpApiGroup.make("health")
  .add(
    HttpApiEndpoint.get("basicHealth", "/api/health")
      .addSuccess(HealthStatusSchema)
      .setHeaders(Schema.Struct({
        "x-debug-key": Schema.optional(Schema.String)
      }))
  )
  .add(
    HttpApiEndpoint.get("envHealth", "/api/health/env")
      .addSuccess(EnvStatusSchema)
  )

// Health check API
export const healthApi = HttpApi.make("HealthAPI")
  .add(healthGroup)

// Handler implementation
export const HealthApiLive = HttpApiBuilder.group(healthApi, "health", (handlers) =>
  Effect.gen(function* () {
    const dbService = yield* DatabaseService

    return handlers
      .handle("basicHealth", ({ headers }) =>
        Effect.gen(function* () {
          // Check database connectivity
          yield* dbService.query(async (db) =>
            db.selectFrom('members').select('id').limit(1).execute()
          )

          const basicHealth = {
            status: "healthy" as const,
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || "1.0.0",
            database: "connected",
            environment: process.env.NODE_ENV || "development",
          }

          // Check if debug information is requested
          const debugKey = headers["x-debug-key"]
          const expectedKey = process.env.DEBUG_KEY || "debug-secret-key-2025"

          if (debugKey === expectedKey) {
            const debugInfo = yield* buildDebugInfo(basicHealth)
            return debugInfo
          }

          return basicHealth
        })
      )
      .handle("envHealth", () =>
        Effect.gen(function* () {
          const actualValues = ["DATABASE_PATH"]
          const requiredVars = ["JWT_SECRET"]
          const optionalVars = [
            "KLAVIYO_API_KEY",
            "DISCORD_BOT_TOKEN",
            "EVENTBRITE_API_TOKEN",
            "PATREON_CLIENT_ID",
          ]

          const env = {
            values: {} as Record<string, any>,
            required: {} as Record<string, boolean>,
            optional: {} as Record<string, boolean>,
            issues: [] as string[],
          }

          actualValues.forEach((varName) => {
            const exists = process.env[varName]
            env.values[varName] = exists
            if (!exists) {
              env.issues.push(`Missing required environment variable: ${varName}`)
            }
          })

          requiredVars.forEach((varName) => {
            const exists = !!process.env[varName]
            env.required[varName] = exists
            if (!exists) {
              env.issues.push(`Missing required environment variable: ${varName}`)
            }
          })

          optionalVars.forEach((varName) => {
            env.optional[varName] = !!process.env[varName]
          })

          const dbInfo = yield* getDatabaseInfo()
          const hasIssues = env.issues.length > 0

          return {
            status: hasIssues ? ("configuration_issues" as const) : ("ok" as const),
            timestamp: new Date().toISOString(),
            environment: env,
            database: dbInfo,
          }
        })
      )
  })
)

// Helper function to build debug information
const buildDebugInfo = (basicHealth: any) =>
  Effect.gen(function* () {
    const dbService = yield* DatabaseService
    
    // Get database table counts safely
    const tableCounts = yield* Effect.gen(function* () {
      const memberResult = yield* dbService.query(async (db) =>
        db
          .selectFrom('members')
          .select(db.fn.count('id').as('count'))
          .executeTakeFirst()
      )
      const eventResult = yield* dbService.query(async (db) =>
        db
          .selectFrom('events')
          .select(db.fn.count('id').as('count'))
          .executeTakeFirst()
      )
      const membershipResult = yield* dbService.query(async (db) =>
        db
          .selectFrom('memberships' as any)
          .select(db.fn.count('id').as('count'))
          .executeTakeFirst()
      )

      return {
        members: memberResult?.count || 0,
        events: eventResult?.count || 0,
        memberships: membershipResult?.count || 0,
      }
    }).pipe(
      Effect.catchAll(() =>
        Effect.succeed({ error: 'Could not retrieve table counts' })
      )
    )

    // Get git information safely
    const gitInfo = yield* Effect.try({
      try: () => {
        const gitHeadPath = path.resolve('.git/HEAD')
        if (fs.existsSync(gitHeadPath)) {
          const head = fs.readFileSync(gitHeadPath, 'utf8').trim()
          if (head.startsWith('ref: ')) {
            const refPath = head.substring(5)
            const commitPath = path.resolve('.git', refPath)
            if (fs.existsSync(commitPath)) {
              const commit = fs.readFileSync(commitPath, 'utf8').trim()
              return {
                branch: refPath.replace('refs/heads/', ''),
                commit: commit.substring(0, 7),
                fullCommit: commit,
              }
            }
          }
        }
        return {}
      },
      catch: () => ({ error: 'Could not retrieve git information' }),
    })

    // Get comprehensive database info
    const dbInfo = yield* getDatabaseInfo()

    return {
      ...basicHealth,
      debug: {
        application: {
          name: 'Club Management System',
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          port: process.env.PORT || 3000,
          uptime: `${Math.floor(process.uptime())} seconds`,
        },
        database: {
          ...dbInfo,
          tableCounts,
        },
        system: {
          platform: os.platform(),
          arch: os.arch(),
          hostname: os.hostname(),
          release: os.release(),
          totalMemory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
          freeMemory: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
          cpus: os.cpus().length,
          loadAverage: os.loadavg(),
        },
        process: {
          pid: process.pid,
          version: process.version,
          nodeVersion: process.versions.node,
          platform: process.platform,
          arch: process.arch,
          memoryUsage: process.memoryUsage(),
          uptime: process.uptime(),
          cwd: process.cwd(),
        },
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          DATABASE_PATH: process.env.DATABASE_PATH
            ? '[CONFIGURED]'
            : '[NOT SET]',
          KLAVIYO_API_KEY: process.env.KLAVIYO_API_KEY
            ? '[CONFIGURED]'
            : '[NOT SET]',
          DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN
            ? '[CONFIGURED]'
            : '[NOT SET]',
          PATREON_CLIENT_ID: process.env.PATREON_CLIENT_ID
            ? '[CONFIGURED]'
            : '[NOT SET]',
          PORT: process.env.PORT || '[DEFAULT: 3000]',
        },
        git: gitInfo,
        network: Object.entries(os.networkInterfaces())
          .filter(([name]) => !name.startsWith('lo')) // Filter out loopback
          .map(([name, addresses]) => ({
            name,
            addresses:
              addresses
                ?.filter((addr) => addr.family === 'IPv4')
                .map((addr) => addr.address) || [],
          })),
        time: {
          iso: new Date().toISOString(),
          unix: Math.floor(Date.now() / 1000),
          local: new Date().toString(),
          utc: new Date().toUTCString(),
        },
      },
    }
  })

// Helper function to get database information
const getDatabaseInfo = () =>
  Effect.gen(function* () {
    const dbService = yield* DatabaseService
    const dbPath =
      process.env.DATABASE_PATH || path.join(__dirname, '../../data/club.db')
    const absoluteDbPath = path.resolve(dbPath)

    // Get SQLite version information using raw SQLite operations
    const sqliteInfo = yield* dbService.querySync((db) => {
      const sqliteVersion = db.pragma('sqlite_version', { simple: true })
      const userVersion = db.pragma('user_version', { simple: true })
      const schemaVersion = db.pragma('schema_version', { simple: true })
      const pageCount = db.pragma('page_count', { simple: true }) as number
      const pageSize = db.pragma('page_size', { simple: true }) as number
      const cacheSize = db.pragma('cache_size', { simple: true }) as number

      return {
        version: sqliteVersion,
        userVersion: userVersion,
        schemaVersion: schemaVersion,
        pageCount: pageCount,
        pageSize: pageSize,
        cacheSize: cacheSize,
        totalPages: pageCount * pageSize,
      }
    })

    // Get file system information
    const fileInfo = yield* Effect.try({
      try: () => {
        const stats = fs.statSync(absoluteDbPath)
        return {
          size: stats.size,
          sizeFormatted: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
          modified: stats.mtime.toISOString(),
          created: stats.birthtime.toISOString(),
          path: absoluteDbPath,
          exists: true,
          configured: !!process.env.DATABASE_PATH,
        }
      },
      catch: () => ({
        error: 'Could not retrieve database file info',
        path: absoluteDbPath,
        exists: false,
        configured: !!process.env.DATABASE_PATH,
      }),
    })

    return {
      type: 'SQLite',
      sqlite: {
        version: sqliteInfo.version,
        userVersion: sqliteInfo.userVersion,
        schemaVersion: sqliteInfo.schemaVersion,
      },
      file: fileInfo,
      statistics: {
        pageCount: sqliteInfo.pageCount,
        pageSize: sqliteInfo.pageSize,
        cacheSize: sqliteInfo.cacheSize,
        totalPages: sqliteInfo.totalPages,
      },
    }
  })