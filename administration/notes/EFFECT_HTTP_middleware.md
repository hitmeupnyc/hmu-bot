## Middlewares

### Defining Middleware

The `HttpApiMiddleware` module allows you to add middleware to your API. Middleware can enhance your API by introducing features like logging, authentication, or additional error handling.

You can define middleware using the `HttpApiMiddleware.Tag` class, which lets you specify:

| Option     | Description                                                                                                                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `failure`  | A schema that describes any errors the middleware might return.                                                                                                                                                                 |
| `provides` | A `Context.Tag` representing the resource or data the middleware will provide to subsequent handlers.                                                                                                                           |
| `security` | Definitions from `HttpApiSecurity` that the middleware will implement, such as authentication mechanisms.                                                                                                                       |
| `optional` | A boolean indicating whether the request should continue if the middleware fails with an expected error. When `optional` is set to `true`, the `provides` and `failure` options do not affect the final error type or handlers. |

**Example** (Defining a Logger Middleware)

```ts
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema
} from "@effect/platform"
import { Schema } from "effect"

// Define a schema for errors returned by the logger middleware
class LoggerError extends Schema.TaggedError<LoggerError>()(
  "LoggerError",
  {}
) {}

// Extend the HttpApiMiddleware.Tag class to define the logger middleware tag
class Logger extends HttpApiMiddleware.Tag<Logger>()("Http/Logger", {
  // Optionally define the error schema for the middleware
  failure: LoggerError
}) {}

const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
})

const idParam = HttpApiSchema.param("id", Schema.NumberFromString)

const usersGroup = HttpApiGroup.make("users")
  .add(
    HttpApiEndpoint.get("getUser")`/user/${idParam}`
      .addSuccess(User)
      // Apply the middleware to a single endpoint
      .middleware(Logger)
  )
  // Or apply the middleware to the entire group
  .middleware(Logger)
```

### Implementing HttpApiMiddleware

Once you have defined your `HttpApiMiddleware`, you can implement it as a `Layer`. This allows the middleware to be applied to specific API groups or endpoints, enabling modular and reusable behavior.

**Example** (Implementing and Using Logger Middleware)

```ts
import { HttpApiMiddleware, HttpServerRequest } from "@effect/platform"
import { Effect, Layer } from "effect"

class Logger extends HttpApiMiddleware.Tag<Logger>()("Http/Logger") {}

const LoggerLive = Layer.effect(
  Logger,
  Effect.gen(function* () {
    yield* Effect.log("creating Logger middleware")

    // Middleware implementation as an Effect
    // that can access the `HttpServerRequest` context.
    return Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest
      yield* Effect.log(`Request: ${request.method} ${request.url}`)
    })
  })
)
```

After implementing the middleware, you can attach it to your API groups or specific endpoints using the `Layer` APIs.

```ts
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema,
  HttpServerRequest
} from "@effect/platform"
import { DateTime, Effect, Layer, Schema } from "effect"

// Define a schema for errors returned by the logger middleware
class LoggerError extends Schema.TaggedError<LoggerError>()(
  "LoggerError",
  {}
) {}

// Extend the HttpApiMiddleware.Tag class to define the logger middleware tag
class Logger extends HttpApiMiddleware.Tag<Logger>()("Http/Logger", {
  // Optionally define the error schema for the middleware
  failure: LoggerError
}) {}

const LoggerLive = Layer.effect(
  Logger,
  Effect.gen(function* () {
    yield* Effect.log("creating Logger middleware")

    // Middleware implementation as an Effect
    // that can access the `HttpServerRequest` context.
    return Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest
      yield* Effect.log(`Request: ${request.method} ${request.url}`)
    })
  })
)

const User = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc
})

const idParam = HttpApiSchema.param("id", Schema.NumberFromString)

const usersGroup = HttpApiGroup.make("users")
  .add(
    HttpApiEndpoint.get("getUser")`/user/${idParam}`
      .addSuccess(User)
      // Apply the middleware to a single endpoint
      .middleware(Logger)
  )
  // Or apply the middleware to the entire group
  .middleware(Logger)

const api = HttpApi.make("myApi").add(usersGroup)

const usersGroupLive = HttpApiBuilder.group(api, "users", (handlers) =>
  handlers.handle("getUser", (req) =>
    Effect.succeed({
      id: req.path.id,
      name: "John Doe",
      createdAt: DateTime.unsafeNow()
    })
  )
).pipe(
  // Provide the Logger middleware to the group
  Layer.provide(LoggerLive)
)
```

### Defining security middleware

The `HttpApiSecurity` module enables you to add security annotations to your API. These annotations specify the type of authorization required to access specific endpoints.

Supported authorization types include:

| Authorization Type       | Description                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| `HttpApiSecurity.apiKey` | API key authorization via headers, query parameters, or cookies. |
| `HttpApiSecurity.basic`  | HTTP Basic authentication.                                       |
| `HttpApiSecurity.bearer` | Bearer token authentication.                                     |

These security annotations can be used alongside `HttpApiMiddleware` to create middleware that protects your API endpoints.

**Example** (Defining Security Middleware)

```ts
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiSecurity
} from "@effect/platform"
import { Context, Schema } from "effect"

// Define a schema for the "User"
class User extends Schema.Class<User>("User")({ id: Schema.Number }) {}

// Define a schema for the "Unauthorized" error
class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  {},
  // Specify the HTTP status code for unauthorized errors
  HttpApiSchema.annotations({ status: 401 })
) {}

// Define a Context.Tag for the authenticated user
class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, User>() {}

// Create the Authorization middleware
class Authorization extends HttpApiMiddleware.Tag<Authorization>()(
  "Authorization",
  {
    // Define the error schema for unauthorized access
    failure: Unauthorized,
    // Specify the resource this middleware will provide
    provides: CurrentUser,
    // Add security definitions
    security: {
      // ┌─── Custom name for the security definition
      // ▼
      myBearer: HttpApiSecurity.bearer
      // Additional security definitions can be added here.
      // They will attempt to be resolved in the order they are defined.
    }
  }
) {}

const api = HttpApi.make("api")
  .add(
    HttpApiGroup.make("group")
      .add(
        HttpApiEndpoint.get("get", "/")
          .addSuccess(Schema.String)
          // Apply the middleware to a single endpoint
          .middleware(Authorization)
      )
      // Or apply the middleware to the entire group
      .middleware(Authorization)
  )
  // Or apply the middleware to the entire API
  .middleware(Authorization)
```

### Implementing HttpApiSecurity middleware

When using `HttpApiSecurity` in your middleware, the implementation involves creating a `Layer` with security handlers tailored to your requirements. Below is an example demonstrating how to implement middleware for `HttpApiSecurity.bearer` authentication.

**Example** (Implementing Bearer Token Authentication Middleware)

```ts
import {
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiSecurity
} from "@effect/platform"
import { Context, Effect, Layer, Redacted, Schema } from "effect"

class User extends Schema.Class<User>("User")({ id: Schema.Number }) {}

class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  {},
  HttpApiSchema.annotations({ status: 401 })
) {}

class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, User>() {}

class Authorization extends HttpApiMiddleware.Tag<Authorization>()(
  "Authorization",
  {
    failure: Unauthorized,
    provides: CurrentUser,
    security: {
      myBearer: HttpApiSecurity.bearer
    }
  }
) {}

const AuthorizationLive = Layer.effect(
  Authorization,
  Effect.gen(function* () {
    yield* Effect.log("creating Authorization middleware")

    // Return the security handlers for the middleware
    return {
      // Define the handler for the Bearer token
      // The Bearer token is redacted for security
      myBearer: (bearerToken) =>
        Effect.gen(function* () {
          yield* Effect.log(
            "checking bearer token",
            Redacted.value(bearerToken)
          )
          // Return a mock User object as the CurrentUser
          return new User({ id: 1 })
        })
    }
  })
)
```

### Adding Descriptions to Security Definitions

The `HttpApiSecurity.annotate` function allows you to add metadata, such as a description, to your security definitions. This metadata is displayed in the Swagger documentation, making it easier for developers to understand your API's security requirements.

**Example** (Adding a Description to a Bearer Token Security Definition)

```ts
import {
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiSecurity,
  OpenApi
} from "@effect/platform"
import { Context, Schema } from "effect"

class User extends Schema.Class<User>("User")({ id: Schema.Number }) {}

class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  {},
  HttpApiSchema.annotations({ status: 401 })
) {}

class CurrentUser extends Context.Tag("CurrentUser")<CurrentUser, User>() {}

class Authorization extends HttpApiMiddleware.Tag<Authorization>()(
  "Authorization",
  {
    failure: Unauthorized,
    provides: CurrentUser,
    security: {
      myBearer: HttpApiSecurity.bearer.pipe(
        // Add a description to the security definition
        HttpApiSecurity.annotate(OpenApi.Description, "my description")
      )
    }
  }
) {}
```

### Setting HttpApiSecurity cookies

To set a security cookie from within a handler, you can use the `HttpApiBuilder.securitySetCookie` API. This method sets a cookie with default properties, including the `HttpOnly` and `Secure` flags, ensuring the cookie is not accessible via JavaScript and is transmitted over secure connections.

**Example** (Setting a Security Cookie in a Login Handler)

```ts
// Define the security configuration for an API key stored in a cookie
const security = HttpApiSecurity.apiKey({
   // Specify that the API key is stored in a cookie
  in: "cookie"
   // Define the cookie name,
  key: "token"
})

const UsersApiLive = HttpApiBuilder.group(MyApi, "users", (handlers) =>
  handlers.handle("login", () =>
    // Set the security cookie with a redacted value
    HttpApiBuilder.securitySetCookie(security, Redacted.make("keep me secret"))
  )
)
```
