# installation: Installation
URL: /docs/installation
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/installation.mdx

Learn how to configure Better Auth in your project.

title: Installation
description: Learn how to configure Better Auth in your project.
----------------------------------------------------------------

<Steps>
  <Step>
  ### Install the Package

  Let's start by adding Better Auth to your project:

  <Tabs>
    <Tab value="npm">
    ```bash
    npm install better-auth
    ```
    </Tab>
  </Tabs>

  <Callout type="info">
    If you're using a separate client and server setup, make sure to install Better Auth in both parts of your project.
  </Callout>
  </Step>

  <Step>
  ### Set Environment Variables

  Create a `.env` file in the root of your project and add the following environment variables:

  1. **Secret Key**

  Random value used by the library for encryption and generating hashes. You can use something like openssl.

  ```txt title=".env"
  BETTER_AUTH_SECRET=
  BETTER_AUTH_URL=http://localhost:3000 # Base URL of your app
  ```
  </Step>

  <Step>
  ### Create A Better Auth Instance

  Import Better Auth and create your auth instance. Make sure to export the auth instance with the variable name `auth` or as a `default` export.

  ```ts title="auth.ts"
  import { betterAuth } from "better-auth";

  export const auth = betterAuth({
    //...
  });
  ```
  </Step>

  <Step>
  ### Configure Database

  Better Auth requires a database to store user data.
  You can easily configure Better Auth to use SQLite, PostgreSQL, or MySQL, and more!

  <Tabs>
    <Tab value="sqlite">
    ```ts title="auth.ts"
    export const auth = betterAuth({ database: db })
    ```
    </Tab>
  </Step>

  <Step>
  ### Create Database Tables

  Better Auth includes a CLI tool to help manage the schema required by the library.

  * **Generate**: This command generates an ORM schema or SQL migration file.

  <Callout>
    If you're using Kysely, you can apply the migration directly with `migrate` command below. Use `generate` only if you plan to apply the migration manually.
  </Callout>

  ```bash title="Terminal"
  npx @better-auth/cli generate
  ```

  * **Migrate**: This command creates the required tables directly in the database. (Available only for the built-in Kysely adapter)

  ```bash title="Terminal"
  npx @better-auth/cli migrate
  ```

  see the [CLI documentation](/docs/concepts/cli) for more information.

  <Callout>
    If you instead want to create the schema manually, you can find the core schema required in the [database section](/docs/concepts/database#core-schema).
  </Callout>
  </Step>

  <Step>
  ### Authentication Methods

  Configure the authentication methods you want to use. Better Auth comes with built-in support for email/password, and social sign-on providers.

  ```ts title="auth.ts"
  import { betterAuth } from "better-auth";

  export const auth = betterAuth({
    emailAndPassword: {
    enabled: true,
    },
    socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
    },
  });
  ```

  <Callout type="info">
    You can use even more authentication methods like [passkey](/docs/plugins/passkey), [username](/docs/plugins/username), [magic link](/docs/plugins/magic-link) and more through plugins.
  </Callout>
  </Step>

  <Step>
    <Tab value="express">
    <Callout type="warn">
      ExpressJS v5 introduced breaking changes to route path matching by switching to `path-to-regexp@6`. Wildcard routes like `*` should now be written using the new named syntax, e.g. `/{*any}`, to properly capture catch-all patterns. This ensures compatibility and predictable behavior across routing scenarios.
      See the [Express v5 migration guide](https://expressjs.com/en/guide/migrating-5.html) for details.

      As a result, the implementation in ExpressJS v5 should look like this:

      ```ts
      app.all('/api/auth/{*any}', toNodeHandler(auth));
      ```

      *The name any is arbitrary and can be replaced with any identifier you prefer.*
    </Callout>

    ```ts title="server.ts"
    import express from "express";
    import { toNodeHandler } from "better-auth/node";
    import { auth } from "./auth";

    const app = express();
    const port = 8000;

    app.all("/api/auth/*", toNodeHandler(auth));

    // Mount express json middleware after Better Auth handler
    // or only apply it to routes that don't interact with Better Auth
    app.use(express.json());

    app.listen(port, () => {
      console.log(`Better Auth app listening on port ${port}`);
    });
    ```

    This will also work for any other node server framework like express, fastify, hapi, etc., but may require some modifications.
    </Tab>
  </Tabs>
  </Step>

  <Step>
  ### Create Client Instance
  <Tabs>
    <Tab value="vanilla">
    ```ts title="lib/auth-client.ts"
    import { createAuthClient } from "better-auth/client"
    export const authClient = createAuthClient({
      baseURL: "http://localhost:3000"
    })
    ```
    </Tab>

    <Tab value="react" title="lib/auth-client.ts">
    ```ts title="lib/auth-client.ts"
    import { createAuthClient } from "better-auth/react"
    export const authClient = createAuthClient({
      baseURL: "http://localhost:3000"
    })
    ```
    </Tab>
  </Tabs>
  </Step>
</Steps>

# adapters: SQLite
URL: /docs/adapters/sqlite
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/adapters/sqlite.mdx

Integrate Better Auth with SQLite.

title: SQLite
description: Integrate Better Auth with SQLite.
-----------------------------------------------

SQLite is a lightweight, serverless, self-contained SQL database engine that is widely used for local data storage in applications.
Read more [here.](https://www.sqlite.org/)

## Example Usage

Make sure you have SQLite installed and configured. Then, you can connect it straight into Better Auth.

This is an example; make sure to consult the project for its specific database configuration.

```ts title="auth.ts"
import { betterAuth } from "better-auth";
import Database from "better-sqlite3";

export const auth = betterAuth({
  database: new Database("database.sqlite"),
});
```

<Callout>
  For more information, read Kysely's documentation to the
  [SqliteDialect](https://kysely-org.github.io/kysely-apidoc/classes/SqliteDialect.html).
</Callout>

## Schema generation & migration

The [Better Auth CLI](/docs/concepts/cli) allows you to generate or migrate
your database schema based on your Better Auth configuration and plugins.

<table>
  <thead>
  <tr className="border-b">
    <th>
    <p className="font-bold text-[16px] mb-1">SQLite Schema Generation</p>
    </th>

    <th>
    <p className="font-bold text-[16px] mb-1">SQLite Schema Migration</p>
    </th>
  </tr>
  </thead>

  <tbody>
  <tr className="h-10">
    <td>✅ Supported</td>
    <td>✅ Supported</td>
  </tr>
  </tbody>
</table>

```bash 
# Schema Generation
npx @better-auth/cli@latest generate
# Schema Migration
npx @better-auth/cli@latest migrate
```

## Additional Information

If you're looking for performance improvements or tips, take a look at our guide to <Link href="/docs/guides/optimizing-for-performance">performance optimizations</Link>.

# concepts: API
URL: /docs/concepts/api
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/concepts/api.mdx

Better Auth API.

title: API
description: Better Auth API.
-----------------------------

When you create a new Better Auth instance, it provides you with an `api` object. This object exposes every endpoint that exist in your Better Auth instance. And you can use this to interact with Better Auth server side.

Any endpoint added to Better Auth, whether from plugins or the core, will be accessible through the `api` object.

## Calling API Endpoints on the Server

To call an API endpoint on the server, import your `auth` instance and call the endpoint using the `api` object. This is a simplified example, consult the project documentation to see how it's integrated

```ts title="server.ts"
import { betterAuth } from "better-auth";
import { headers } from "next/headers";

export const auth = betterAuth({ /* … */ })

// calling get session on the server
await auth.api.getSession({
  headers: await headers() // some endpoint might require headers
})
```

### Body, Headers, Query

Unlike the client, the server needs the values to be passed as an object with the key `body` for the body, `headers` for the headers, and `query` for query parameters.

```ts title="server.ts"
await auth.api.getSession({
  headers: await headers()
})
```

<Callout>
  Better auth API endpoints are built on top of [better-call](https://github.com/bekacru/better-call), a tiny web framework that lets you call REST API endpoints as if they were regular functions, and allows us to easily infer client types from the server.
</Callout>

### Getting `headers` and `Response` Object

When you invoke an API endpoint on the server, it will return a standard JavaScript object or array directly as it's just a regular function call.

But there are times where you might want to get the `headers` or the `Response` object instead. For example, if you need to get the cookies or the headers.

#### Getting `headers`

To get the `headers`, you can pass the `returnHeaders` option to the endpoint.

```ts
const { headers, response } = await auth.api.signUpEmail({
  returnHeaders: true,
  body: {
  email: "john@doe.com",
  password: "password",
  name: "John Doe",
  },
});
```

The `headers` will be a `Headers` object. Which you can use to get the cookies or the headers.

```ts
const cookies = headers.get("set-cookie");
const headers = headers.get("x-custom-header");
```

#### Getting `Response` Object

To get the `Response` object, you can pass the `asResponse` option to the endpoint.

```ts title="server.ts"
const response = await auth.api.signInEmail({
  body: {
    email: "",
    password: ""
  },
  asResponse: true
})
```

### Error Handling

When you call an API endpoint in the server, it will throw an error if the request fails. You can catch the error and handle it as you see fit. The error instance is an instance of `APIError`.

```ts title="server.ts"
import { APIError } from "better-auth/api";

try {
  await auth.api.signInEmail({ /* … */ })
} catch (error) {
  if (error instanceof APIError) {
    console.log(error.message, error.status)
  }
}
```

# concepts: CLI
URL: /docs/concepts/cli
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/concepts/cli.mdx

Built-in CLI for managing your project.

title: CLI
description: Built-in CLI for managing your project.
----------------------------------------------------

Better Auth comes with a built-in CLI to help you manage the database schemas, initialize your project, and generate a secret key for your application.

## Generate

The `generate` command creates the schema required by Better Auth. If you're using the built-in Kysely adapter, it will generate an SQL file you can run directly on your database.

```bash title="Terminal"
npx @better-auth/cli@latest generate
```

### Options

* `--output` - Where to save the generated schema. For Kysely, it’s an SQL file saved as schema.sql in your project root.
* `--config` - The path to your Better Auth config file. By default, the CLI will search for a auth.ts file in **./**, **./utils**, **./lib**, or any of these directories under `src` directory.
* `--yes` - Skip the confirmation prompt and generate the schema directly.

## Migrate

The migrate command applies the Better Auth schema directly to your database. This is available if you’re using the built-in Kysely adapter. For other adapters, you'll need to apply the schema using your ORM's migration tool.

```bash title="Terminal"
npx @better-auth/cli@latest migrate
```

### Options

* `--config` - The path to your Better Auth config file. By default, the CLI will search for a auth.ts file in **./**, **./utils**, **./lib**, or any of these directories under `src` directory.
* `--yes` - Skip the confirmation prompt and apply the schema directly.

## Init

The `init` command allows you to initialize Better Auth in your project.

```bash title="Terminal"
npx @better-auth/cli@latest init
```

### Options

* `--name` - The name of your application. (Defaults to your `package.json`'s `name` property.)
* `--framework` - The framework your codebase is using. Currently, the only supported framework is `nextjs`.
* `--plugins` - The plugins you want to use. You can specify multiple plugins by separating them with a comma.
* `--database` - The database you want to use. Currently, the only supported database is `sqlite`.
* `--package-manager` - The package manager you want to use. Currently, the only supported package managers are `npm`, `pnpm`, `yarn`, `bun`

## Secret

The CLI also provides a way to generate a secret key for your Better Auth instance.

```bash title="Terminal"
npx @better-auth/cli@latest secret
```

## Common Issues

**Error: Cannot find module X**

If you see this error, it means the CLI can’t resolve imported modules in your Better Auth config file. We're working on a fix for many of these issues, but in the meantime, you can try the following:

* Remove any import aliases in your config file and use relative paths instead. After running the CLI, you can revert to using aliases.

# concepts: Client
URL: /docs/concepts/client
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/concepts/client.mdx

Better Auth client library for authentication.

title: Client
description: Better Auth client library for authentication.
-----------------------------------------------------------

Better Auth offers a client library compatible with popular frontend frameworks like React, Vue, Svelte, and more. This client library includes a set of functions for interacting with the Better Auth server. Each framework's client library is built on top of a core client library that is framework-agnostic, so that all methods and hooks are consistently available across all client libraries.

## Installation

If you haven't already, install better-auth.

```bash
npm i better-auth
```

## Create Client Instance

Import `createAuthClient` from the package for your framework (e.g., "better-auth/react" for React). Call the function to create your client. Pass the base URL of your auth server. If the auth server is running on the same domain as your client, you can skip this step.

<Callout type="info">
  If you're using a different base path other than `/api/auth`, make sure to pass the whole URL, including the path. (e.g., `http://localhost:3000/custom-path/auth`)
</Callout>

<Tabs>
  <Tab value="vanilla">
  ```ts
  import { createAuthClient } from "better-auth/client"
  export const authClient = createAuthClient({
    baseURL: "http://localhost:3000" // The base URL of your auth server
  })
  ```
  </Tab>

  <Tab value="react">
  ```ts 
  import { createAuthClient } from "better-auth/react"
  export const authClient = createAuthClient({
    baseURL: "http://localhost:3000" // The base URL of your auth server
  })
  ```
  </Tab>
</Tabs>

## Usage

Once you've created your client instance, you can use the client to interact with the Better Auth server. The client provides a set of functions by default and they can be extended with plugins.

**Example: Sign In**

```ts
import { createAuthClient } from "better-auth/client"
const authClient = createAuthClient()

await authClient.signIn.email({ /* … */ })
```

### Hooks

On top of normal methods, the client provides hooks to easily access different reactive data. Every hook is available in the root object of the client and they all start with `use`.

**Example: useSession**

<Tabs>
  <Tab value="React">
  ```tsx
  import { createAuthClient } from "better-auth/react"
  const { useSession } = createAuthClient()

  export function User() {
    const {
      data: session,
      isPending,
      error,
      refetch
    } = useSession()
    return (
      //...
    )
  }
  ```
  </Tab>
</Tabs>

### Fetch Options

The client uses a library called [better fetch](https://better-fetch.vercel.app) to make requests to the server.

Better fetch is a wrapper around the native fetch API that provides a more convenient way to make requests. It's created by the same team behind Better Auth and is designed to work seamlessly with it.

You can pass any default fetch options to the client by passing `fetchOptions` object to the `createAuthClient`.

```ts
import { createAuthClient } from "better-auth/client"

const authClient = createAuthClient({
  fetchOptions: {
    //any better-fetch options
  },
})
```

You can also pass fetch options to most of the client functions. Either as the second argument or as a property in the object.

```ts
await authClient.signIn.email({
  email: "email@email.com",
  password: "password1234",
}, {
  onSuccess(ctx) {
      //    
  }
})

//or

await authClient.signIn.email({
  email: "email@email.com",
  password: "password1234",
  fetchOptions: {
    onSuccess(ctx) {
      //    
    }
  },
})
```

### Handling Errors

Most of the client functions return a response object with the following properties:

* `data`: The response data.
* `error`: The error object if there was an error.

the error object contains the following properties:

* `message`: The error message. (e.g., "Invalid email or password")
* `status`: The HTTP status code.
* `statusText`: The HTTP status text.

```ts
const { data, error } = await authClient.signIn.email({
  email: "email@email.com",
  password: "password1234"
})
if (error) {
  //handle error
}
```

If the actions accepts a `fetchOptions` option, you can pass `onError` callback to handle errors.

```ts

await authClient.signIn.email({
  email: "email@email.com",
  password: "password1234",
}, {
  onError(ctx) {
    //handle error
  }
})

//or
await authClient.signIn.email({
  email: "email@email.com",
  password: "password1234",
  fetchOptions: {
    onError(ctx) {
      //handle error
    }
  }
})
```

Hooks like `useSession` also return an error object if there was an error fetching the session. On top of that, they also return a `isPending` property to indicate if the request is still pending.

```ts
const { data, error, isPending } = useSession()
if (error) {
  //handle error
}
```

#### Error Codes

The client instance contains $ERROR\_CODES object that contains all the error codes returned by the server. You can use this to handle error translations or custom error messages.

```ts
const authClient = createAuthClient();

type ErrorTypes = Partial<
  Record<
  keyof typeof authClient.$ERROR_CODES,
  {
    en: string;
    es: string;
  }
  >
>;

const errorCodes = {
  USER_ALREADY_EXISTS: {
  en: "user already registered",
  es: "usuario ya registrada",
  },
} satisfies ErrorTypes;

const getErrorMessage = (code: string, lang: "en" | "es") => {
  if (code in errorCodes) {
  return errorCodes[code as keyof typeof errorCodes][lang];
  }
  return "";
};


const { error } = await authClient.signUp.email({
  email: "user@email.com",
  password: "password",
  name: "User",
});
if(error?.code){
  alert(getErrorMessage(error.code, "en"));
}
```

### Plugins

You can extend the client with plugins to add more functionality. Plugins can add new functions to the client or modify existing ones.

**Example: Magic Link Plugin**

```ts
import { createAuthClient } from "better-auth/client"
import { magicLinkClient } from "better-auth/client/plugins"

const authClient = createAuthClient({
  plugins: [
    magicLinkClient()
  ]
})
```

once you've added the plugin, you can use the new functions provided by the plugin.

```ts
await authClient.signIn.magicLink({
  email: "test@email.com"
})
```



# concepts: Cookies
URL: /docs/concepts/cookies
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/concepts/cookies.mdx

Learn how cookies are used in Better Auth.

title: Cookies
description: Learn how cookies are used in Better Auth.
-------------------------------------------------------

Cookies are used to store data such as session tokens, OAuth state, and more. All cookies are signed using the `secret` key provided in the auth options.

### Cookie Prefix

Better Auth cookies will follow `${prefix}.${cookie_name}` format by default. The prefix will be "better-auth" by default. You can change the prefix by setting `cookiePrefix` in the `advanced` object of the auth options.

```ts title="auth.ts"
import { betterAuth } from "better-auth"

export const auth = betterAuth({
  advanced: {
    cookiePrefix: "my-app"
  }
})
```

### Custom Cookies

All cookies are `httpOnly` and `secure` if the server is running in production mode.

If you want to set custom cookie names and attributes, you can do so by setting `cookieOptions` in the `advanced` object of the auth options.

By default, Better Auth uses the following cookies:

* `session_token` to store the session token
* `session_data` to store the session data if cookie cache is enabled
* `dont_remember` to store the `dont_remember` flag if remember me is disabled

Plugins may also use cookies to store data. For example, the Two Factor Authentication plugin uses the `two_factor` cookie to store the two-factor authentication state.

```ts title="auth.ts"
import { betterAuth } from "better-auth"

export const auth = betterAuth({
  advanced: {
    cookies: {
      session_token: {
        name: "custom_session_token",
        attributes: {
          // Set custom cookie attributes
        }
      },
    }
  }
})
```

### Secure Cookies

By default, cookies are secure only when the server is running in production mode. You can force cookies to be always secure by setting `useSecureCookies` to `true` in the `advanced` object in the auth options.

```ts title="auth.ts"
import { betterAuth } from "better-auth"

export const auth = betterAuth({
  advanced: {
    useSecureCookies: true
  }
})
```

# concepts: Session Management
URL: /docs/concepts/session-management
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/concepts/session-management.mdx

Better Auth session management.

title: Session Management
description: Better Auth session management.
--------------------------------------------

Better Auth manages session using a traditional cookie-based session management. The session is stored in a cookie and is sent to the server on every request. The server then verifies the session and returns the user data if the session is valid.

## Session table

The session table stores the session data. The session table has the following fields:

* `id`: The session token. Which is also used as the session cookie.
* `userId`: The user ID of the user.
* `expiresAt`: The expiration date of the session.
* `ipAddress`: The IP address of the user.
* `userAgent`: The user agent of the user. It stores the user agent header from the request.

## Session Expiration

The session expires after 7 days by default. But whenever the session is used and the `updateAge` is reached, the session expiration is updated to the current time plus the `expiresIn` value.

You can change both the `expiresIn` and `updateAge` values by passing the `session` object to the `auth` configuration.

```ts title="auth.ts"
import { betterAuth } from "better-auth"

export const auth = betterAuth({
  //... other config options
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24 // 1 day (every 1 day the session expiration is updated)
  }
})
```

### Disable Session Refresh

You can disable session refresh so that the session is not updated regardless of the `updateAge` option.

```ts title="auth.ts"
import { betterAuth } from "better-auth"

export const auth = betterAuth({
  //... other config options
  session: {
    disableSessionRefresh: true
  }
})
```

## Session Freshness

Some endpoints in Better Auth require the session to be **fresh**. A session is considered fresh if its `createdAt` is within the `freshAge` limit. By default, the `freshAge` is set to **1 day** (60 \* 60 \* 24).

You can customize the `freshAge` value by passing a `session` object in the `auth` configuration:

```ts title="auth.ts"
import { betterAuth } from "better-auth"

export const auth = betterAuth({
  //... other config options
  session: {
    freshAge: 60 * 5 // 5 minutes (the session is fresh if created within the last 5 minutes)
  }
})
```

To **disable the freshness check**, set `freshAge` to `0`:

```ts title="auth.ts"
import { betterAuth } from "better-auth"

export const auth = betterAuth({
  //... other config options
  session: {
    freshAge: 0 // Disable freshness check
  }
})
```

## Session Management

Better Auth provides a set of functions to manage sessions.

### Get Session

The `getSession` function retrieves the current active session.

```ts client="client.ts"
import { authClient } from "@/lib/client"

const { data: session } = await authClient.getSession()
```

To learn how to customize the session response check the [Customizing Session Response](#customizing-session-response) section.

### Use Session

The `useSession` action provides a reactive way to access the current session.

```ts client="client.ts"
import { authClient } from "@/lib/client"

const { data: session } = authClient.useSession()
```

### List Sessions

The `listSessions` function returns a list of sessions that are active for the user.

```ts
import { authClient } from "@/lib/client"

const sessions = await authClient.listSessions()
```

### Revoke Session

When a user signs out of a device, the session is automatically ended. However, you can also end a session manually from any device the user is signed into.

To end a session, use the `revokeSession` function. Just pass the session token as a parameter.

```ts
await authClient.revokeSession({
  token: "session-token"
})
```

### Revoke Other Sessions

To revoke all other sessions except the current session, you can use the `revokeOtherSessions` function.

```ts
await authClient.revokeOtherSessions()
```

### Revoke All Sessions

To revoke all sessions, you can use the `revokeSessions` function.

```ts
await authClient.revokeSessions()
```

### Revoking Sessions on Password Change

You can revoke all sessions when the user changes their password by passing `revokeOtherSessions` as true on `changePassword` function.

```ts title="auth.ts"
await authClient.changePassword({
  newPassword: newPassword,
  currentPassword: currentPassword,
  revokeOtherSessions: true,
})
```

## Session Caching

### Cookie Cache

Calling your database every time `useSession` or `getSession` invoked isn’t ideal, especially if sessions don’t change frequently. Cookie caching handles this by storing session data in a short-lived, signed cookie—similar to how JWT access tokens are used with refresh tokens.

When cookie caching is enabled, the server can check session validity from the cookie itself instead of hitting the database each time. The cookie is signed to prevent tampering, and a short `maxAge` ensures that the session data gets refreshed regularly. If a session is revoked or expires, the cookie will be invalidated automatically.

To turn on cookie caching, just set `session.cookieCache` in your auth config:

```ts title="auth.ts"
import { betterAuth } from "better-auth"

export const auth = betterAuth({
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60 // Cache duration in seconds
    }
  }
});
```

If you want to disable returning from the cookie cache when fetching the session, you can pass `disableCookieCache:true` this will force the server to fetch the session from the database and also refresh the cookie cache.

```ts
const session = await authClient.getSession({ query: {
  disableCookieCache: true
}})
```

or on the server

```ts title="server.ts"
await auth.api.getSession({
  query: {
    disableCookieCache: true,
  }, 
  headers: req.headers, // pass the headers
});
```

# concepts: TypeScript
URL: /docs/concepts/typescript
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/concepts/typescript.mdx

Better Auth TypeScript integration.

title: TypeScript
description: Better Auth TypeScript integration.
------------------------------------------------

Better Auth is designed to be type-safe. Both the client and server are built with TypeScript, allowing you to easily infer types.

## TypeScript Config

### Strict Mode

Better Auth is designed to work with TypeScript's strict mode. We recommend enabling strict mode in your TypeScript config file:

```json title="tsconfig.json"
{
  "compilerOptions": {
  "strict": true
  }
}
```

if you can't set `strict` to `true`, you can enable `strictNullChecks`:

```json title="tsconfig.json"
{
  "compilerOptions": {
  "strictNullChecks": true,
  }
}
```

<Callout type="warn">
  If you're running into issues with TypeScript inference exceeding maximum length the compiler will serialize,
  then please make sure you're following the instructions above, as well as ensuring that both `declaration` and `composite` are not enabled.
</Callout>

## Inferring Types

Both the client SDK and the server offer types that can be inferred using the `$Infer` property. Plugins can extend base types like `User` and `Session`, and you can use `$Infer` to infer these types. Additionally, plugins can provide extra types that can also be inferred through `$Infer`.

```ts 
import { createAuthClient } from "better-auth/client"

const authClient = createAuthClient()

export type Session = typeof authClient.$Infer.Session
```

The `Session` type includes both `session` and `user` properties. The user property represents the user object type, and the `session` property represents the `session` object type.

You can also infer types on the server side.

```ts title="auth.ts" 
import { betterAuth } from "better-auth"
import Database from "better-sqlite3"

export const auth = betterAuth({
  database: new Database("database.db")
})

type Session = typeof auth.$Infer.Session
```

# integrations: Express Integration
URL: /docs/integrations/express
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/integrations/express.mdx

Integrate Better Auth with Express.

title: Express Integration
description: Integrate Better Auth with Express.
------------------------------------------------

This guide will show you how to integrate Better Auth with [express.js](https://expressjs.com/).

Before you start, make sure you have a Better Auth instance configured. If you haven't done that yet, check out the [installation](/docs/installation).

<Callout>
  Note that CommonJS (cjs) isn't supported. Use ECMAScript Modules (ESM) by setting `"type": "module"` in your `package.json` or configuring your `tsconfig.json` to use ES modules.
</Callout>

### Mount the handler

To enable Better Auth to handle requests, we need to mount the handler to an API route. Create a catch-all route to manage all requests to `/api/auth/*` in case of ExpressJS v4 or `/api/auth/*splat` in case of ExpressJS v5 (or any other path specified in your Better Auth options).

<Callout type="warn">
  Don’t use `express.json()` before the Better Auth handler. Use it only for other routes, or the client API will get stuck on "pending".
</Callout>

```ts title="server.ts"
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";

const app = express();
const port = 3005;

app.all("/api/auth/*", toNodeHandler(auth)); // For ExpressJS v4
// app.all("/api/auth/*splat", toNodeHandler(auth)); For ExpressJS v5 

// Mount express json middleware after Better Auth handler
// or only apply it to routes that don't interact with Better Auth
app.use(express.json());

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
```

After completing the setup, start your server. Better Auth will be ready to use. You can send a `GET` request to the `/ok` endpoint (`/api/auth/ok`) to verify that the server is running.

### Cors Configuration

To add CORS (Cross-Origin Resource Sharing) support to your Express server when integrating Better Auth, you can use the `cors` middleware. Below is an updated example showing how to configure CORS for your server:

```ts
import express from "express";
import cors from "cors"; // Import the CORS middleware
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth";

const app = express();
const port = 3005;

// Configure CORS middleware
app.use(
  cors({
  origin: "http://your-frontend-domain.com", // Replace with your frontend's origin
  methods: ["GET", "POST", "PUT", "DELETE"], // Specify allowed HTTP methods
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  })
);
```

### Getting the User Session

To retrieve the user's session, you can use the `getSession` method provided by the `auth` object. This method requires the request headers to be passed in a specific format. To simplify this process, Better Auth provides a `fromNodeHeaders` helper function that converts Node.js request headers to the format expected by Better Auth (a `Headers` object).

Here's an example of how to use `getSession` in an Express route:

```ts title="server.ts"
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth"; // Your Better Auth instance

app.get("/api/me", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  return res.json(session);
});
```

# plugins: Admin
URL: /docs/plugins/admin
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/plugins/admin.mdx

Admin plugin for Better Auth

title: Admin
description: Admin plugin for Better Auth
-----------------------------------------

The Admin plugin provides a set of administrative functions for user management in your application. It allows administrators to perform various operations such as creating users, managing user roles, banning/unbanning users, impersonating users, and more.

## Installation

<Steps>
  <Step>
  ### Add the plugin to your auth config

  To use the Admin plugin, add it to your auth config.

  ```ts title="auth.ts"
  import { betterAuth } from "better-auth"
  import { admin } from "better-auth/plugins"

  export const auth = betterAuth({
    // …
    plugins: [ admin() ]
  })
  ```
  </Step>

  <Step>
  ### Migrate the database

  Run the migration or generate the schema to add the necessary fields and tables to the database.

  <Tabs>
    <Tab value="migrate">
    ```bash
    npx @better-auth/cli migrate
    ```
    </Tab>

    <Tab value="generate">
    ```bash
    npx @better-auth/cli generate
    ```
    </Tab>
  </Tabs>

  See the [Schema](#schema) section to add the fields manually.
  </Step>

  <Step>
  ### Add the client plugin

  Next, include the admin client plugin in your authentication client instance.

  ```ts
  import { createAuthClient } from "better-auth/client"
  import { adminClient } from "better-auth/client/plugins"

  export const authClient = createAuthClient({
    plugins: [
      adminClient()
    ]
  })
  ```
  </Step>
</Steps>

## Usage

Before performing any admin operations, the user must be authenticated with an admin account. An admin is any user assigned the `admin` role or any user whose ID is included in the `adminUserIds` option.

### Create User

Allows an admin to create a new user.

<APIMethod path="/admin/create-user" method="POST" resultVariable="newUser">
  ```ts
  type createUser = {
    email: string = "user@example.com"
    password: string = "some-secure-password"
    name: string = "James Smith"
    role?: string | string[] = "user"
    data?: Record<string, any> = { customField: "customValue" }
  }
  ```
</APIMethod>

### List Users

Allows an admin to list all users in the database.

<APIMethod path="/admin/list-users" method="GET" requireSession note={"All properties are optional to configure. By default, 100 rows are returned, you can configure this by the `limit` property."} resultVariable={"users"}>
  ```ts
  type listUsers = {
    searchValue?: string = "some name"
    searchField?: "email" | "name" = "name"
    searchOperator?: "contains" | "starts_with" | "ends_with" = "contains"
    limit?: string | number = 100
    offset?: string | number = 100
    sortBy?: string = "name"
    sortDirection?: "asc" | "desc" = "desc"
    filterField?: string = "email"
    filterValue?: string | number | boolean = "hello@example.com"
    filterOperator?: "eq" | "ne" | "lt" | "lte" | "gt" | "gte" = "eq"
  }
  ```
</APIMethod>

#### Query Filtering

The `listUsers` function supports various filter operators including `eq`, `contains`, `starts_with`, and `ends_with`.

#### Pagination

The `listUsers` function supports pagination by returning metadata alongside the user list. The response includes the following fields:

```ts
{
  users: User[],   // Array of returned users
  total: number,   // Total number of users after filters and search queries
  limit: number | undefined,   // The limit provided in the query
  offset: number | undefined   // The offset provided in the query
}
```

##### How to Implement Pagination

To paginate results, use the `total`, `limit`, and `offset` values to calculate:

* **Total pages:** `Math.ceil(total / limit)`
* **Current page:** `(offset / limit) + 1`
* **Next page offset:** `Math.min(offset + limit, (total - 1))` – The value to use as `offset` for the next page, ensuring it does not exceed the total number of pages.
* **Previous page offset:** `Math.max(0, offset - limit)` – The value to use as `offset` for the previous page (ensuring it doesn’t go below zero).

##### Example Usage

Fetching the second page with 10 users per page:

```ts title="admin.ts"
const pageSize = 10;
const currentPage = 2;

const users = await authClient.admin.listUsers({
  query: {
    limit: pageSize,
    offset: (currentPage - 1) * pageSize
  }
});

const totalUsers = users.total;
const totalPages = Math.ceil(totalUsers / limit)
```

### Set User Role

Changes the role of a user.

<APIMethod path="/admin/set-role" method="POST" requireSession>
  ```ts
  type setRole = {
    userId?: string = "user-id"
    role: string | string[] = "admin"
  }
  ```
</APIMethod>

### Set User Password

Changes the password of a user.

<APIMethod path="/admin/set-user-password" method="POST" requireSession>
  ```ts
  type setUserPassword = {
    newPassword: string = 'new-password'
    userId: string = 'user-id'
  }
  ```
</APIMethod>

### List User Sessions

Lists all sessions for a user.

<APIMethod path="/admin/list-user-sessions" method="POST" requireSession>
  ```ts
  type listUserSessions = {
    userId: string = "user-id"
  }
  ```
</APIMethod>

### Revoke User Session

Revokes a specific session for a user.

<APIMethod path="/admin/revoke-user-session" method="POST" requireSession>
  ```ts
  type revokeUserSession = {
    sessionToken: string = "session_token_here"
  }
  ```
</APIMethod>

### Revoke All Sessions for a User

Revokes all sessions for a user.

<APIMethod path="/admin/revoke-user-sessions" method="POST" requireSession>
  ```ts
  type revokeUserSessions = {
    userId: string = "user-id"
  }
  ```
</APIMethod>

### Remove User

Hard deletes a user from the database.

<APIMethod path="/admin/remove-user" method="POST" requireSession resultVariable="deletedUser">
  ```ts
  type removeUser = {
    userId: string = "user-id"
  }
  ```
</APIMethod>

## Schema

This plugin adds the following fields to the `user` table:

<DatabaseTable
  fields={[
  {
  name: "role",
  type: "string",
  description:
    "The user's role. Defaults to `user`. Admins will have the `admin` role.",
  isOptional: true,
  },
  {
  name: "banned",
  type: "boolean",
  description: "Indicates whether the user is banned.",
  isOptional: true,
  },
  {
  name: "banReason",
  type: "string",
  description: "The reason for the user's ban.",
  isOptional: true,
  },
  {
  name: "banExpires",
  type: "date",
  description: "The date when the user's ban will expire.",
  isOptional: true,
  },
]}
/>

And adds one field in the `session` table:

<DatabaseTable
  fields={[
  {
  name: "impersonatedBy",
  type: "string",
  description: "The ID of the admin that is impersonating this session.",
  isOptional: true,
  },
]}
/>

# plugins: Magic link
URL: /docs/plugins/magic-link
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/plugins/magic-link.mdx

Magic link plugin

title: Magic link
description: Magic link plugin
------------------------------

Magic link or email link is a way to authenticate users without a password. When a user enters their email, a link is sent to their email. When the user clicks on the link, they are authenticated.

## Installation

<Steps>
  <Step>
  ### Add the server Plugin

  Add the magic link plugin to your server:

  ```ts title="server.ts"
  import { betterAuth } from "better-auth";
  import { magicLink } from "better-auth/plugins";

  export const auth = betterAuth({
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, token, url }, request) => {
          // send email to user
        }
      })
    ]
  })
  ```
  </Step>

  <Step>
  ### Add the client Plugin

  Add the magic link plugin to your client:

  ```ts
  import { createAuthClient } from "better-auth/client";
  import { magicLinkClient } from "better-auth/client/plugins";
  export const authClient = createAuthClient({
    plugins: [
      magicLinkClient()
    ]
  });
  ```
  </Step>
</Steps>

## Usage

### Sign In with Magic Link

To sign in with a magic link, you need to call `signIn.magicLink` with the user's email address. The `sendMagicLink` function is called to send the magic link to the user's email.

<APIMethod path="/sign-in/magic-link" method="POST" requireSession>
  ```ts
  type signInMagicLink = {
    email: string = "user@email.com"
    name?: string = "my-name"
    callbackURL?: string = "/dashboard"
    newUserCallbackURL?: string = "/welcome"
    errorCallbackURL?: string = "/error"
  }
  ```
</APIMethod>

<Callout>
  If the user has not signed up, unless `disableSignUp` is set to `true`, the user will be signed up automatically.
</Callout>

### Verify Magic Link

When you send the URL generated by the `sendMagicLink` function to a user, clicking the link will authenticate them and redirect them to the `callbackURL` specified in the `signIn.magicLink` function. If an error occurs, the user will be redirected to the `callbackURL` with an error query parameter.

<Callout type="warn">
  If no `callbackURL` is provided, the user will be redirected to the root URL.
</Callout>

If you want to handle the verification manually, (e.g, if you send the user a different URL), you can use the `verify` function.

<APIMethod path="/magic-link/verify" method="GET" requireSession>
  ```ts
  type magicLinkVerify = {
    token: string = "123456"
    callbackURL?: string = "/dashboard"
  }
  ```
</APIMethod>

## Configuration Options

**sendMagicLink**: The `sendMagicLink` function is called when a user requests a magic link. It takes an object with the following properties:

* `email`: The email address of the user.
* `url`: The URL to be sent to the user. This URL contains the token.
* `token`: The token if you want to send the token with custom URL.

and a `request` object as the second parameter.

**expiresIn**: specifies the time in seconds after which the magic link will expire. The default value is `300` seconds (5 minutes).

**disableSignUp**: If set to `true`, the user will not be able to sign up using the magic link. The default value is `false`.

**generateToken**: The `generateToken` function is called to generate a token which is used to uniquely identify the user. The default value is a random string. There is one parameter:

* `email`: The email address of the user.

<Callout type="warn">
  When using `generateToken`, ensure that the returned string is hard to guess
  because it is used to verify who someone actually is in a confidential way. By
  default, we return a long and cryptographically secure string.
</Callout>

**storeToken**: The `storeToken` function is called to store the magic link token in the database. The default value is `"plain"`.

The `storeToken` function can be one of the following:

* `"plain"`: The token is stored in plain text.
* `"hashed"`: The token is hashed using the default hasher.
* `{ type: "custom-hasher", hash: (token: string) => Promise<string> }`: The token is hashed using a custom hasher.


