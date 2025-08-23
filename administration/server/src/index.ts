/**
 * Club Management System API Server
 * Built with @effect/platform-node and HttpApi
 */

import { 
  HttpApiBuilder, 
  HttpApiSwagger, 
  HttpMiddleware, 
  HttpServer 
} from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Layer, Logger, LogLevel } from "effect"
import { createServer } from "node:http"
import dotenv from "dotenv"

// Load environment variables
dotenv.config()

// Import our API definition and implementations
import { api, ApiLive } from "./api"
import { AuthenticationLive, AuthorizationLive } from "./middleware/auth"
import { ApplicationLive } from "./services/effect/adapters/expressAdapter"

const PORT = process.env.PORT || 3000

// Configure and serve the API
const ServerLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  // Add Swagger documentation
  Layer.provide(HttpApiSwagger.layer({ 
    path: "/docs",
    openApi: { 
      info: {
        title: "Club Management System API",
        version: "1.0.0",
        description: "RESTful API for managing club members, events, and operations"
      }
    }
  })),
  
  // Add CORS middleware
  Layer.provide(HttpApiBuilder.middlewareCors()),
  
  // Add authentication and authorization middleware
  // Layer.provide(AuthenticationLive), // Temporarily disabled for testing
  // Layer.provide(AuthorizationLive), // Temporarily disabled for testing
  
  // Add API implementation
  Layer.provide(ApiLive),
  
  // Add application services (database, etc.)
  Layer.provide(ApplicationLive),
  
  // Configure HTTP server
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: PORT }))
)

// Configure logging level
const MainLive = ServerLive.pipe(
  Layer.provide(Logger.minimumLogLevel(LogLevel.Info))
)

// Launch the server
Layer.launch(MainLive).pipe(NodeRuntime.runMain)
