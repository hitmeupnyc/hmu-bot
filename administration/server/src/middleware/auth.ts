/**
 * Authentication and Authorization middleware for @effect/platform HttpApi
 * Migrated from Effect HTTP pipeline functions
 */

import {
  HttpApiMiddleware,
  HttpApiSecurity,
  HttpApiSchema,
  HttpServerRequest,
} from "@effect/platform"
import { Context, Effect, Layer, Redacted, Schema } from "effect"
import { TimeoutException } from "effect/Cause"
import {
  AuthorizationError,
  AuthorizationService,
  type Action,
  type Subject,
} from "~/services/effect/AuthorizationEffects"
import { 
  Auth, 
  AuthenticationError, 
  type Session,
  type IAuth 
} from "~/services/effect/layers/AuthLayer"

// Context tags for authenticated user and session
export class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, Session["user"]>() {}
export class ActiveSession extends Context.Tag("ActiveSession")<ActiveSession, Session>() {}

// Authentication error for HttpApi
class UnauthorizedError extends Schema.TaggedError<UnauthorizedError>()(
  "UnauthorizedError",
  {
    reason: Schema.Literal("missing_session", "invalid_session", "expired_session", "auth_service_error"),
    message: Schema.String
  },
  HttpApiSchema.annotations({ status: 401 })
) {}

// Authorization error for HttpApi  
class ForbiddenError extends Schema.TaggedError<ForbiddenError>()(
  "ForbiddenError", 
  {
    reason: Schema.Literal("permission_denied"),
    message: Schema.String,
    resource: Schema.optional(Schema.String),
    requiredPermission: Schema.optional(Schema.String)
  },
  HttpApiSchema.annotations({ status: 403 })
) {}

// Authentication middleware
export class Authentication extends HttpApiMiddleware.Tag<Authentication>()(
  "Authentication",
  {
    failure: UnauthorizedError,
    provides: CurrentUser,
    security: {
      bearer: HttpApiSecurity.bearer.pipe(
        HttpApiSecurity.annotate({
          description: "Bearer token authentication using session tokens"
        })
      ),
      // Also support cookie-based auth for web clients
      sessionCookie: HttpApiSecurity.apiKey({
        in: "cookie",
        key: "better-auth.session_token"
      }).pipe(
        HttpApiSecurity.annotate({
          description: "Session cookie authentication"
        })
      )
    }
  }
) {}

// Authorization middleware (requires authentication)
export class Authorization extends HttpApiMiddleware.Tag<Authorization>()(
  "Authorization",
  {
    failure: ForbiddenError,
    provides: ActiveSession,
    security: {
      bearer: HttpApiSecurity.bearer
    }
  }
) {}

// Authentication middleware implementation
export const AuthenticationLive = Layer.effect(
  Authentication,
  Effect.gen(function* () {
    const authService = yield* Auth
    
    return {
      bearer: (token) =>
        Effect.gen(function* () {
          const headers = { 
            authorization: `Bearer ${Redacted.value(token)}`
          }
          
          const session = yield* authService.validateSession(headers)
            .pipe(
              Effect.mapError((error) => {
                if (error instanceof AuthenticationError) {
                  return new UnauthorizedError({
                    reason: error.reason,
                    message: error.message
                  })
                }
                if (error instanceof TimeoutException) {
                  return new UnauthorizedError({
                    reason: "auth_service_error",
                    message: "Authentication service timeout"
                  })
                }
                return new UnauthorizedError({
                  reason: "auth_service_error", 
                  message: "Unknown authentication error"
                })
              })
            )
          
          return session.user
        }),
        
      sessionCookie: (sessionToken) =>
        Effect.gen(function* () {
          const headers = {
            cookie: `better-auth.session_token=${Redacted.value(sessionToken)}`
          }
          
          const session = yield* authService.validateSession(headers)
            .pipe(
              Effect.mapError((error) => {
                if (error instanceof AuthenticationError) {
                  return new UnauthorizedError({
                    reason: error.reason,
                    message: error.message
                  })
                }
                if (error instanceof TimeoutException) {
                  return new UnauthorizedError({
                    reason: "auth_service_error",
                    message: "Authentication service timeout"
                  })
                }
                return new UnauthorizedError({
                  reason: "auth_service_error",
                  message: "Unknown authentication error"
                })
              })
            )
          
          return session.user
        })
    }
  })
)

// Authorization middleware implementation
export const AuthorizationLive = Layer.effect(
  Authorization,
  Effect.gen(function* () {
    const authService = yield* Auth
    
    return {
      bearer: (token) =>
        Effect.gen(function* () {
          const headers = { 
            authorization: `Bearer ${Redacted.value(token)}`
          }
          
          const session = yield* authService.validateSession(headers)
            .pipe(
              Effect.mapError((error) => {
                if (error instanceof AuthenticationError) {
                  return new UnauthorizedError({
                    reason: error.reason,
                    message: error.message
                  })
                }
                return new UnauthorizedError({
                  reason: "auth_service_error",
                  message: "Unknown authentication error"
                })
              })
            )
          
          return session
        })
    }
  })
)

// Helper function to create permission-checking middleware
export const requirePermission = (
  action: Action,
  subject: Subject | ((request: any) => Subject),
  field?: string
) => {
  class PermissionMiddleware extends HttpApiMiddleware.Tag<PermissionMiddleware>()(
    `Permission_${action}_${typeof subject === "string" ? subject : "dynamic"}`,
    {
      failure: ForbiddenError
    }
  ) {}

  const PermissionMiddlewareLive = Layer.effect(
    PermissionMiddleware,
    Effect.gen(function* () {
      const authorizationService = yield* AuthorizationService
      
      return Effect.gen(function* () {
        const user = yield* CurrentUser
        const request = yield* HttpServerRequest.HttpServerRequest
        
        // Extract path parameters for dynamic subjects
        const targetSubject = typeof subject === "function" 
          ? subject(request)
          : subject
        
        const hasPermission = yield* authorizationService
          .checkPermission(user.id, action, targetSubject, field)
          .pipe(
            Effect.catchAll(() => Effect.succeed(false))
          )
        
        if (!hasPermission) {
          return yield* Effect.fail(
            new ForbiddenError({
              reason: "permission_denied",
              message: `Insufficient permissions for ${action} on ${
                typeof targetSubject === "string" 
                  ? targetSubject 
                  : JSON.stringify(targetSubject)
              }`,
              resource: typeof targetSubject === "string" 
                ? targetSubject 
                : JSON.stringify(targetSubject),
              requiredPermission: action
            })
          )
        }
      })
    })
  )

  return { PermissionMiddleware, PermissionMiddlewareLive }
}

// Export commonly used permission middleware instances
export const ReadMembersPermission = requirePermission("read", "members")
export const CreateMembersPermission = requirePermission("create", "members") 
export const UpdateMembersPermission = requirePermission("update", "members")
export const DeleteMembersPermission = requirePermission("delete", "members")

export const ReadEventsPermission = requirePermission("read", "events")
export const CreateEventsPermission = requirePermission("create", "events")
export const UpdateEventsPermission = requirePermission("update", "events") 
export const DeleteEventsPermission = requirePermission("delete", "events")

// Dynamic permission helpers for resource-specific access
export const ReadMemberPermission = (id: string | number) =>
  requirePermission("read", { type: "members", id: String(id) })

export const ReadEventPermission = (id: string | number) => 
  requirePermission("read", { type: "events", id: String(id) })

export const UpdateEventPermission = (id: string | number) =>
  requirePermission("update", { type: "events", id: String(id) })