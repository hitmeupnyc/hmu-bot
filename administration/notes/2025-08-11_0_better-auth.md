# basic-usage: Basic Usage
URL: /docs/basic-usage
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/basic-usage.mdx

Getting started with Better Auth
        
***

title: Basic Usage
description: Getting started with Better Auth
---------------------------------------------

Better Auth provides built-in authentication support for:

* **Email and password**
* **Social provider (Google, GitHub, Apple, and more)**

But also can easily be extended using plugins, such as: [username](/docs/plugins/username), [magic link](/docs/plugins/magic-link), [passkey](/docs/plugins/passkey), [email-otp](/docs/plugins/email-otp), and more.

## Email & Password

To enable email and password authentication:

```ts title="auth.ts"
import { betterAuth } from "better-auth"

export const auth = betterAuth({
    emailAndPassword: {    // [!code highlight]
        enabled: true // [!code highlight]
    } // [!code highlight]
})
```

### Sign Up

To sign up a user you need to call the client method `signUp.email` with the user's information.

```ts title="sign-up.ts"
import { authClient } from "@/lib/auth-client"; //import the auth client // [!code highlight]

const { data, error } = await authClient.signUp.email({
        email, // user email address
        password, // user password -> min 8 characters by default
        name, // user display name
        image, // User image URL (optional)
        callbackURL: "/dashboard" // A URL to redirect to after the user verifies their email (optional)
    }, {
        onRequest: (ctx) => {
            //show loading
        },
        onSuccess: (ctx) => {
            //redirect to the dashboard or sign in page
        },
        onError: (ctx) => {
            // display the error message
            alert(ctx.error.message);
        },
});
```

By default, the users are automatically signed in after they successfully sign up. To disable this behavior you can set `autoSignIn` to `false`.

```ts title="auth.ts"
import { betterAuth } from "better-auth"

export const auth = betterAuth({
    emailAndPassword: {
      enabled: true,
      autoSignIn: false //defaults to true // [!code highlight]
  },
})
```

### Sign In

To sign a user in, you can use the `signIn.email` function provided by the client.

```ts title="sign-in"
const { data, error } = await authClient.signIn.email({
        /**
         * The user email
         */
        email,
        /**
         * The user password
         */
        password,
        /**
         * A URL to redirect to after the user verifies their email (optional)
         */
        callbackURL: "/dashboard",
        /**
         * remember the user session after the browser is closed. 
         * @default true
         */
        rememberMe: false
}, {
    //callbacks
})
```

<Callout type="warn">
  Always invoke client methods from the client side. Don't call them from the server.
</Callout>

### Server-Side Authentication

To authenticate a user on the server, you can use the `auth.api` methods.

```ts title="server.ts"
import { auth } from "./auth"; // path to your Better Auth server instance

const response = await auth.api.signInEmail({
    body: {
        email,
        password
    },
    asResponse: true // returns a response object instead of data
});
```

<Callout>
  If the server cannot return a response object, you'll need to manually parse and set cookies. But for frameworks like Next.js we provide [a plugin](/docs/integrations/next#server-action-cookies) to handle this automatically
</Callout>

## Signout

To signout a user, you can use the `signOut` function provided by the client.

```ts title="user-card.tsx"
await authClient.signOut();
```

you can pass `fetchOptions` to redirect onSuccess

```ts title="user-card.tsx" 
await authClient.signOut({
  fetchOptions: {
    onSuccess: () => {
      router.push("/login"); // redirect to login page
    },
  },
});
```

## Session

Once a user is signed in, you'll want to access the user session. Better Auth allows you easily to access the session data from the server and client side.

### Client Side

#### Use Session

Better Auth provides a `useSession` hook to easily access session data on the client side. This hook is implemented using nanostore and has support for each supported framework and vanilla client, ensuring that any changes to the session (such as signing out) are immediately reflected in your UI.

<Tabs>
  <Tab value="React">
    ```tsx title="user.tsx"
    import { authClient } from "@/lib/auth-client" // import the auth client // [!code highlight] 

    export function User(){

        const { // [!code highlight]
            data: session, // [!code highlight]
            isPending, //loading state // [!code highlight]
            error, //error object // [!code highlight]
            refetch //refetch the session
        } = authClient.useSession() // [!code highlight]

        return (
            //...
        )
    }
    ```
  </Tab>

  <Tab value="Vanilla">
    ```ts title="user.svelte"
    import { authClient } from "~/lib/auth-client"; //import the auth client

    authClient.useSession.subscribe((value)=>{
        //do something with the session //
    }) 
    ```
  </Tab>
</Tabs>

#### Get Session

If you prefer not to use the hook, you can use the `getSession` method provided by the client.

```ts title="user.tsx"
import { authClient } from "@/lib/auth-client" // import the auth client // [!code highlight]

const { data: session, error } = await authClient.getSession()
```

You can also use it with client-side data-fetching libraries like [TanStack Query](https://tanstack.com/query/latest).

### Server Side

The server provides a `session` object that you can use to access the session data. It requires request headers object to be passed to the `getSession` method.

**Example: Using some popular frameworks**

<Tabs>
  <Tab value="Hono">
    ```ts title="index.ts"
    import { auth } from "./auth";

    const app = new Hono();

    app.get("/path", async (c) => {
        const session = await auth.api.getSession({
            headers: c.req.raw.headers
        })
    });
    ```
  </Tab>

  <Tab value="TanStack">
    ```ts title="app/routes/api/index.ts"
    import { auth } from "./auth";
    import { createAPIFileRoute } from "@tanstack/start/api";

    export const APIRoute = createAPIFileRoute("/api/$")({
        GET: async ({ request }) => {
            const session = await auth.api.getSession({
                headers: request.headers
            })
        },
    });
    ```
  </Tab>
</Tabs>

<Callout>
  For more details check [session-management](/docs/concepts/session-management) documentation.
</Callout>

## Using Plugins

One of the unique features of Better Auth is a plugins ecosystem. It allows you to add complex auth related functionality with small lines of code.

Below is an example of how to add two factor authentication using two factor plugin.

<Steps>
  <Step>
    ### Server Configuration

    To add a plugin, you need to import the plugin and pass it to the `plugins` option of the auth instance. For example, to add two factor authentication, you can use the following code:

    ```ts title="auth.ts"
    import { betterAuth } from "better-auth"
    import { twoFactor } from "better-auth/plugins" // [!code highlight]

    export const auth = betterAuth({
        //...rest of the options
        plugins: [ // [!code highlight]
            twoFactor() // [!code highlight]
        ] // [!code highlight]
    })
    ```

    now two factor related routes and method will be available on the server.
  </Step>

  <Step>
    ### Migrate Database

    After adding the plugin, you'll need to add the required tables to your database. You can do this by running the `migrate` command, or by using the `generate` command to create the schema and handle the migration manually.

    generating the schema:

    ```bash title="terminal"
    npx @better-auth/cli generate
    ```

    using the `migrate` command:

    ```bash title="terminal"
    npx @better-auth/cli migrate
    ```

    <Callout>
      If you prefer adding the schema manually, you can check the schema required on the [two factor plugin](/docs/plugins/2fa#schema) documentation.
    </Callout>
  </Step>

  <Step>
    ### Client Configuration

    Once we're done with the server, we need to add the plugin to the client. To do this, you need to import the plugin and pass it to the `plugins` option of the auth client. For example, to add two factor authentication, you can use the following code:

    ```ts title="auth-client.ts"  
    import { createAuthClient } from "better-auth/client";
    import { twoFactorClient } from "better-auth/client/plugins"; // [!code highlight]

    const authClient = createAuthClient({
        plugins: [ // [!code highlight]
            twoFactorClient({ // [!code highlight]
                twoFactorPage: "/two-factor" // the page to redirect if a user need to verify 2nd factor // [!code highlight]
            }) // [!code highlight]
        ] // [!code highlight]
    })
    ```

    now two factor related methods will be available on the client.

    ```ts title="profile.ts"
    import { authClient } from "./auth-client"

    const enableTwoFactor = async() => {
        const data = await authClient.twoFactor.enable({
            password // the user password is required
        }) // this will enable two factor
    }

    const disableTwoFactor = async() => {
        const data = await authClient.twoFactor.disable({
            password // the user password is required
        }) // this will disable two factor
    }

    const signInWith2Factor = async() => {
        const data = await authClient.signIn.email({
            //...
        })
        //if the user has two factor enabled, it will redirect to the two factor page
    }

    const verifyTOTP = async() => {
        const data = await authClient.twoFactor.verifyTOTP({
            code: "123456", // the code entered by the user 
            /**
             * If the device is trusted, the user won't
             * need to pass 2FA again on the same device
             */
            trustDevice: true
        })
    }
    ```
  </Step>

  <Step>
    Next step: See the <Link href="/docs/plugins/2fa">two factor plugin documentation</Link>.
  </Step>
</Steps>

# installation: Installation
URL: /docs/installation
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/installation.mdx

Learn how to configure Better Auth in your project.
        
***

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

      <Tab value="pnpm">
        ```bash
        pnpm add better-auth
        ```
      </Tab>

      <Tab value="yarn">
        ```bash
        yarn add better-auth
        ```
      </Tab>

      <Tab value="bun">
        ```bash
        bun add better-auth
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

    Random value used by the library for encryption and generating hashes. **You can generate one using the button below** or you can use something like openssl.

    ```txt title=".env"
    BETTER_AUTH_SECRET=
    ```

    <GenerateSecret />

    2. **Set Base URL**

    ```txt title=".env"
    BETTER_AUTH_URL=http://localhost:3000 #Base URL of your app
    ```
  </Step>

  <Step>
    ### Create A Better Auth Instance

    Create a file named `auth.ts` in one of these locations:

    * Project root
    * `lib/` folder
    * `utils/` folder

    You can also nest any of these folders under `src/`, `app/` or `server/` folder. (e.g. `src/lib/auth.ts`, `app/lib/auth.ts`).

    And in this file, import Better Auth and create your auth instance. Make sure to export the auth instance with the variable name `auth` or as a `default` export.

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
        import { betterAuth } from "better-auth";
        import Database from "better-sqlite3";

        export const auth = betterAuth({
            database: new Database("./sqlite.db"),
        })
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
      //...other options
      emailAndPassword: {
        // [!code highlight]
        enabled: true, // [!code highlight]
      }, // [!code highlight]
      socialProviders: {
        // [!code highlight]
        github: {
          // [!code highlight]
          clientId: process.env.GITHUB_CLIENT_ID as string, // [!code highlight]
          clientSecret: process.env.GITHUB_CLIENT_SECRET as string, // [!code highlight]
        }, // [!code highlight]
      }, // [!code highlight]
    });
    ```

    <Callout type="info">
      You can use even more authentication methods like [passkey](/docs/plugins/passkey), [username](/docs/plugins/username), [magic link](/docs/plugins/magic-link) and more through plugins.
    </Callout>
  </Step>

  <Stepitems={["next-js", "nuxt", "svelte-kit", "remix", "solid-start", "hono", "express", "elysia", "tanstack-start", "expo"]} defaultValue="react">
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

        This will also work for any other node server framework like express, fastify, hapi, etc., but may require some modifications. See [fastify guide](/docs/integrations/fastify). Note that CommonJS (cjs) isn't supported.
      </Tab>

      <Tab value="tanstack-start">
        ```ts title="src/routes/api/auth/$.ts"
        import { auth } from '~/lib/server/auth'
        import { createServerFileRoute } from '@tanstack/react-start/server'

        export const ServerRoute = createServerFileRoute('/api/auth/$').methods({
        GET: ({ request }) => {
            return auth.handler(request)
        },
        POST: ({ request }) => {
            return auth.handler(request)
        },
        });
        ```
      </Tab>
    </Tabs>
  </Step>

  <Step>
    ### Create Client Instance

    The client-side library helps you interact with the auth server. Better Auth comes with a client for all the popular web frameworks, including vanilla JavaScript.

    1. Import `createAuthClient` from the package for your framework (e.g., "better-auth/react" for React).
    2. Call the function to create your client.
    3. Pass the base URL of your auth server. (If the auth server is running on the same domain as your client, you can skip this step.)

    <Callout type="info">
      If you're using a different base path other than `/api/auth` make sure to pass
      the whole URL including the path. (e.g.
      `http://localhost:3000/custom-path/auth`)
    </Callout>

    <Tabs
     ,
"vanilla"]}
      defaultValue="react"
    >
      <Tab value="vanilla">
        ```ts title="lib/auth-client.ts"
        import { createAuthClient } from "better-auth/client"
        export const authClient = createAuthClient({
            /** The base URL of the server (optional if you're using the same domain) */ // [!code highlight]
            baseURL: "http://localhost:3000" // [!code highlight]
        })
        ```
      </Tab>

      <Tab value="react" title="lib/auth-client.ts">
        ```ts title="lib/auth-client.ts"
        import { createAuthClient } from "better-auth/react"
        export const authClient = createAuthClient({
            /** The base URL of the server (optional if you're using the same domain) */ // [!code highlight]
            baseURL: "http://localhost:3000" // [!code highlight]
        })
        ```
      </Tab>
    </Tabs>

    <Callout type="info">
      Tip: You can also export specific methods if you prefer:
    </Callout>

    ```ts
    export const { signIn, signUp, useSession } = createAuthClient()
    ```
  </Step>

  <Step>
    ### 🎉 That's it!

    That's it! You're now ready to use better-auth in your application. Continue to [basic usage](/docs/basic-usage) to learn how to use the auth instance to sign in users.
  </Step>
</Steps>



# introduction: Introduction
URL: /docs/introduction
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/introduction.mdx

Introduction to Better Auth.
        
***

title: Introduction
description: Introduction to Better Auth.
-----------------------------------------

Better Auth is a framework-agnostic authentication and authorization framework for TypeScript. It provides a comprehensive set of features out of the box and includes a plugin ecosystem that simplifies adding advanced functionalities. Whether you need 2FA, multi-tenancy, multi-session support, or even enterprise features like SSO, it lets you focus on building your application instead of reinventing the wheel.

## Why Better Auth?

*Authentication in the TypeScript ecosystem has long been a half-solved problem. Other open-source libraries often require a lot of additional code for anything beyond basic authentication features. Rather than just pushing third-party services as the solution, I believe we can do better as a community—hence, Better Auth.*

## Features

Better Auth aims to be the most comprehensive auth library. It provides a wide range of features out of the box and allows you to extend it with plugins. Here are some of the features:

<Features />

...and much more!

## LLMs.txt

Better Auth provides an LLMs.txt file that helps AI models understand how to interact with your authentication system. You can find it at [https://better-auth.com/llms.txt](https://better-auth.com/llms.txt).

# adapters: SQLite
URL: /docs/adapters/sqlite
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/adapters/sqlite.mdx

Integrate Better Auth with SQLite.
        
***

title: SQLite
description: Integrate Better Auth with SQLite.
-----------------------------------------------

SQLite is a lightweight, serverless, self-contained SQL database engine that is widely used for local data storage in applications.
Read more [here.](https://www.sqlite.org/)

## Example Usage

Make sure you have SQLite installed and configured.
Then, you can connect it straight into Better Auth.

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

```bash title="Schema Generation"
npx @better-auth/cli@latest generate
```

```bash title="Schema Migration"
npx @better-auth/cli@latest migrate
```

## Additional Information

SQLite is supported under the hood via the [Kysely](https://kysely.dev/) adapter, any database supported by Kysely would also be supported. (<Link href="/docs/adapters/other-relational-databases">Read more here</Link>)

If you're looking for performance improvements or tips, take a look at our guide to <Link href="/docs/guides/optimizing-for-performance">performance optimizations</Link>.

# authentication: Email & Password
URL: /docs/authentication/email-password
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/authentication/email-password.mdx

Implementing email and password authentication with Better Auth.
        
***

title: Email & Password
description: Implementing email and password authentication with Better Auth.
-----------------------------------------------------------------------------

Email and password authentication is a common method used by many applications. Better Auth provides a built-in email and password authenticator that you can easily integrate into your project.

<Callout type="info">
  If you prefer username-based authentication, check out the{" "}
  <Link href="/docs/plugins/username">username plugin</Link>. It extends the
  email and password authenticator with username support.
</Callout>

## Enable Email and Password

To enable email and password authentication, you need to set the `emailAndPassword.enabled` option to `true` in the `auth` configuration.

```ts title="auth.ts"
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  emailAndPassword: { // [!code highlight]
    enabled: true, // [!code highlight]
  }, // [!code highlight]
});
```

<Callout type="info">
  If it's not enabled, it'll not allow you to sign in or sign up with email and
  password.
</Callout>

## Usage

### Sign Up

To sign a user up, you can use the `signUp.email` function provided by the client.

<APIMethod path="/sign-up/email" method="POST">
  ```ts
  type signUpEmail = {
      /**
       * The name of the user.
       */
      name: string = "John Doe"
      /**
       * The email address of the user.
       */
      email: string = "john.doe@example.com"
      /**
       * The password of the user. It should be at least 8 characters long and max 128 by default.
       */
      password: string = "password1234"
      /**
       * An optional profile image of the user.
       */
      image?: string = "https://example.com/image.png"
      /**
       * An optional URL to redirect to after the user signs up.
       */
      callbackURL?: string = "https://example.com/callback"
  }
  ```
</APIMethod>

<Callout>
  These are the default properties for the sign up email endpoint, however it's possible that with [additional fields](/docs/concepts/typescript#additional-fields) or special plugins you can pass more properties to the endpoint.
</Callout>

### Sign In

To sign a user in, you can use the `signIn.email` function provided by the client.

<APIMethod path="/sign-in/email" method="POST" requireSession>
  ```ts
  type signInEmail = {
      /**
       * The email address of the user.
       */
      email: string = "john.doe@example.com"
      /**
       * The password of the user. It should be at least 8 characters long and max 128 by default.
       */
      password: string = "password1234"
      /**
       * If false, the user will be signed out when the browser is closed. (optional) (default: true)
       */
      rememberMe?: boolean = true
      /**
       * An optional URL to redirect to after the user signs in. (optional)
       */
      callbackURL?: string = "https://example.com/callback"
  }
  ```
</APIMethod>

<Callout>
  These are the default properties for the sign in email endpoint, however it's possible that with [additional fields](/docs/concepts/typescript#additional-fields) or special plugins you can pass different properties to the endpoint.
</Callout>

### Sign Out

To sign a user out, you can use the `signOut` function provided by the client.

<APIMethod path="/sign-out" method="POST" requireSession noResult>
  ```ts
  type signOut = {
  }
  ```
</APIMethod>

you can pass `fetchOptions` to redirect onSuccess

```ts title="auth-client.ts" 
await authClient.signOut({
  fetchOptions: {
    onSuccess: () => {
      router.push("/login"); // redirect to login page
    },
  },
});
```

### Email Verification

To enable email verification, you need to pass a function that sends a verification email with a link. The `sendVerificationEmail` function takes a data object with the following properties:

* `user`: The user object.
* `url`: The URL to send to the user which contains the token.
* `token`: A verification token used to complete the email verification.

and a `request` object as the second parameter.

```ts title="auth.ts"
import { betterAuth } from "better-auth";
import { sendEmail } from "./email"; // your email sending function

export const auth = betterAuth({
  emailVerification: {
    sendVerificationEmail: async ( { user, url, token }, request) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email address",
        text: `Click the link to verify your email: ${url}`,
      });
    },
  },
});
```

On the client side you can use `sendVerificationEmail` function to send verification link to user. This will trigger the `sendVerificationEmail` function you provided in the `auth` configuration.

Once the user clicks on the link in the email, if the token is valid, the user will be redirected to the URL provided in the `callbackURL` parameter. If the token is invalid, the user will be redirected to the URL provided in the `callbackURL` parameter with an error message in the query string `?error=invalid_token`.

#### Require Email Verification

If you enable require email verification, users must verify their email before they can log in. And every time a user tries to sign in, sendVerificationEmail is called.

<Callout>
  This only works if you have sendVerificationEmail implemented and if the user
  is trying to sign in with email and password.
</Callout>

```ts title="auth.ts"
export const auth = betterAuth({
  emailAndPassword: {
    requireEmailVerification: true,
  },
});
```

If a user tries to sign in without verifying their email, you can handle the error and show a message to the user.

```ts title="auth-client.ts"
await authClient.signIn.email(
  {
    email: "email@example.com",
    password: "password",
  },
  {
    onError: (ctx) => {
      // Handle the error
      if (ctx.error.status === 403) {
        alert("Please verify your email address");
      }
      //you can also show the original error message
      alert(ctx.error.message);
    },
  }
);
```

#### Triggering manually Email Verification

You can trigger the email verification manually by calling the `sendVerificationEmail` function.

```ts
await authClient.sendVerificationEmail({
  email: "user@email.com",
  callbackURL: "/", // The redirect URL after verification
});
```

### Request Password Reset

To allow users to reset a password first you need to provide `sendResetPassword` function to the email and password authenticator. The `sendResetPassword` function takes a data object with the following properties:

* `user`: The user object.
* `url`: The URL to send to the user which contains the token.
* `token`: A verification token used to complete the password reset.

and a `request` object as the second parameter.

```ts title="auth.ts"
import { betterAuth } from "better-auth";
import { sendEmail } from "./email"; // your email sending function

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({user, url, token}, request) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        text: `Click the link to reset your password: ${url}`,
      });
    },
    onPasswordReset: async ({ user }, request) => {
      // your logic here
      console.log(`Password for user ${user.email} has been reset.`);
    },
  },
});
```

Additionally, you can provide an `onPasswordReset` callback to execute logic after a password has been successfully reset.

Once you configured your server you can call `requestPasswordReset` function to send reset password link to user. If the user exists, it will trigger the `sendResetPassword` function you provided in the auth config.

<APIMethod path="/request-password-reset" method="POST">
  ```ts
  type requestPasswordReset = {
      /**
       * The email address of the user to send a password reset email to 
       */
      email: string = "john.doe@example.com"
      /**
       * The URL to redirect the user to reset their password. If the token isn't valid or expired, it'll be redirected with a query parameter `?error=INVALID_TOKEN`. If the token is valid, it'll be redirected with a query parameter `?token=VALID_TOKEN 
       */
      redirectTo?: string = "https://example.com/reset-password"
  }
  ```
</APIMethod>

When a user clicks on the link in the email, they will be redirected to the reset password page. You can add the reset password page to your app. Then you can use `resetPassword` function to reset the password. It takes an object with the following properties:

* `newPassword`: The new password of the user.

```ts title="auth-client.ts"
const { data, error } = await authClient.resetPassword({
  newPassword: "password1234",
  token,
});
```

<APIMethod path="/reset-password" method="POST">
  ```ts
  const token = new URLSearchParams(window.location.search).get("token");

  if (!token) {
    // Handle the error
  }

  type resetPassword = {
      /**
       * The new password to set 
       */
      newPassword: string = "password1234"
      /**
       * The token to reset the password 
       */
      token: string
  }
  ```
</APIMethod>

### Update password

A user's password isn't stored in the user table. Instead, it's stored in the account table. To change the password of a user, you can use one of the following approaches:

<APIMethod path="/change-password" method="POST" requireSession>
  ```ts
  type changePassword = {
      /**
       * The new password to set 
       */
      newPassword: string = "newpassword1234"
      /**
       * The current user password 
       */
      currentPassword: string = "oldpassword1234"
      /**
       * When set to true, all other active sessions for this user will be invalidated
       */
      revokeOtherSessions?: boolean = true
  }
  ```
</APIMethod>

### Configuration

**Password**

Better Auth stores passwords inside the `account` table with `providerId` set to `credential`.

**Password Hashing**: Better Auth uses `scrypt` to hash passwords. The `scrypt` algorithm is designed to be slow and memory-intensive to make it difficult for attackers to brute force passwords. OWASP recommends using `scrypt` if `argon2id` is not available. We decided to use `scrypt` because it's natively supported by Node.js.

You can pass custom password hashing algorithm by setting `passwordHasher` option in the `auth` configuration.

```ts title="auth.ts"
import { betterAuth } from "better-auth"
import { scrypt } from "scrypt"

export const auth = betterAuth({
    //...rest of the options
    emailAndPassword: {
        password: {
            hash: // your custom password hashing function
            verify: // your custom password verification function
        }
    }
})
```

<TypeTable
  type={{
  enabled: {
    description: "Enable email and password authentication.",
    type: "boolean",
    default: "false",
  },
  disableSignUp: {
    description: "Disable email and password sign up.",
    type: "boolean",
    default: "false"
  },
  minPasswordLength: {
    description: "The minimum length of a password.",
    type: "number",
    default: 8,
  },
  maxPasswordLength: {
    description: "The maximum length of a password.",
    type: "number",
    default: 128,
  },
  sendResetPassword: {
    description:
      "Sends a password reset email. It takes a function that takes two parameters: token and user.",
    type: "function",
  },
  onPasswordReset: {
    description:
      "A callback function that is triggered when a user's password is changed successfully.",
    type: "function",
  },
  resetPasswordTokenExpiresIn: {
    description:
      "Number of seconds the reset password token is valid for.",
    type: "number",
    default: 3600
  },
  password: {
    description: "Password configuration.",
    type: "object",
    properties: {
      hash: {
        description: "custom password hashing function",
        type: "function",
      },
      verify: {
        description: "custom password verification function",
        type: "function",
      },
    },
  },
}}
/>


# concepts: API
URL: /docs/concepts/api
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/concepts/api.mdx

Better Auth API.
        
***

title: API
description: Better Auth API.
-----------------------------

When you create a new Better Auth instance, it provides you with an `api` object. This object exposes every endpoint that exist in your Better Auth instance. And you can use this to interact with Better Auth server side.

Any endpoint added to Better Auth, whether from plugins or the core, will be accessible through the `api` object.

## Calling API Endpoints on the Server

To call an API endpoint on the server, import your `auth` instance and call the endpoint using the `api` object.

```ts title="server.ts"
import { betterAuth } from "better-auth";
import { headers } from "next/headers";

export const auth = betterAuth({
    //...
})

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

await auth.api.signInEmail({
    body: {
        email: "john@doe.com",
        password: "password"
    },
    headers: await headers() // optional but would be useful to get the user IP, user agent, etc.
})

await auth.api.verifyEmail({
    query: {
        token: "my_token"
    }
})
```

<Callout>
  Better auth API endpoints are built on top of [better-call](https://github.com/bekacru/better-call), a tiny web framework that lets you call REST API endpoints as if they were regular functions and allows us to easily infer client types from the server.
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
    await auth.api.signInEmail({
        body: {
            email: "",
            password: ""
        }
    })
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
        
***

title: CLI
description: Built-in CLI for managing your project.
----------------------------------------------------

Better Auth comes with a built-in CLI to help you manage the database schemas, initialize your project, and generate a secret key for your application.

## Generate

The `generate` command creates the schema required by Better Auth. If you're using a database adapter like Prisma or Drizzle, this command will generate the right schema for your ORM. If you're using the built-in Kysely adapter, it will generate an SQL file you can run directly on your database.

```bash title="Terminal"
npx @better-auth/cli@latest generate
```

### Options

* `--output` - Where to save the generated schema. For Prisma, it will be saved in prisma/schema.prisma. For Drizzle, it goes to schema.ts in your project root. For Kysely, it’s an SQL file saved as schema.sql in your project root.
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
* `--package-manager` - The package manager you want to use. Currently, the only supported package managers are `npm`, `pnpm`, `yarn`, `bun`. (Defaults to the manager you used to initialize the CLI.)

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
        
***

title: Client
description: Better Auth client library for authentication.
-----------------------------------------------------------

Better Auth offers a client library compatible with popular frontend frameworks like React, Vue, Svelte, and more. This client library includes a set of functions for interacting with the Better Auth server. Each framework's client library is built on top of a core client library that is framework-agnostic, so that all methods and hooks are consistently available across all client libraries.

## Installation

If you haven't already, install better-auth.

<Tabs>
  <Tab value="npm">
    ```bash
    npm i better-auth
    ```
  </Tab>
</Tabs>

## Create Client Instance

Import `createAuthClient` from the package for your framework (e.g., "better-auth/react" for React). Call the function to create your client. Pass the base URL of your auth server. If the auth server is running on the same domain as your client, you can skip this step.

<Callout type="info">
  If you're using a different base path other than `/api/auth`, make sure to pass the whole URL, including the path. (e.g., `http://localhost:3000/custom-path/auth`)
</Callout>

<Tabs
  
"vanilla"]}
  defaultValue="react"
>
  <Tab value="vanilla">
    ```ts title="lib/auth-client.ts" 
    import { createAuthClient } from "better-auth/client"
    export const authClient = createAuthClient({
        baseURL: "http://localhost:3000" // The base URL of your auth server // [!code highlight]
    })
    ```
  </Tab>

  <Tab value="react" title="lib/auth-client.ts">
    ```ts title="lib/auth-client.ts"  
    import { createAuthClient } from "better-auth/react"
    export const authClient = createAuthClient({
        baseURL: "http://localhost:3000" // The base URL of your auth server // [!code highlight]
    })
    ```
  </Tab>
</Tabs>

## Usage

Once you've created your client instance, you can use the client to interact with the Better Auth server. The client provides a set of functions by default and they can be extended with plugins.

**Example: Sign In**

```ts title="auth-client.ts"
import { createAuthClient } from "better-auth/client"
const authClient = createAuthClient()

await authClient.signIn.email({
    email: "test@user.com",
    password: "password1234"
})
```

### Hooks

On top of normal methods, the client provides hooks to easily access different reactive data. Every hook is available in the root object of the client and they all start with `use`.

**Example: useSession**

<Tabs>
  <Tab value="React">
    ```tsx title="user.tsx"
    //make sure you're using the react client
    import { createAuthClient } from "better-auth/react"
    const { useSession } = createAuthClient() // [!code highlight]

    export function User() {
        const {
            data: session,
            isPending, //loading state
            error, //error object 
            refetch //refetch the session
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

```ts title="auth-client.ts"
import { createAuthClient } from "better-auth/client"

const authClient = createAuthClient({
    fetchOptions: {
        //any better-fetch options
    },
})
```

You can also pass fetch options to most of the client functions. Either as the second argument or as a property in the object.

```ts title="auth-client.ts"
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

```ts title="auth-client.ts"
const { data, error } = await authClient.signIn.email({
    email: "email@email.com",
    password: "password1234"
})
if (error) {
    //handle error
}
```

If the actions accepts a `fetchOptions` option, you can pass `onError` callback to handle errors.

```ts title="auth-client.ts"

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

```ts title="auth-client.ts"
const { data, error, isPending } = useSession()
if (error) {
    //handle error
}
```

#### Error Codes

The client instance contains $ERROR\_CODES object that contains all the error codes returned by the server. You can use this to handle error translations or custom error messages.

```ts title="auth-client.ts"
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

```ts title="auth-client.ts"
import { createAuthClient } from "better-auth/client"
import { magicLinkClient } from "better-auth/client/plugins"

const authClient = createAuthClient({
    plugins: [
        magicLinkClient()
    ]
})
```

once you've added the plugin, you can use the new functions provided by the plugin.

```ts title="auth-client.ts"
await authClient.signIn.magicLink({
    email: "test@email.com"
})
```



# concepts: Cookies
URL: /docs/concepts/cookies
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/concepts/cookies.mdx

Learn how cookies are used in Better Auth.
        
***

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

### Cross Subdomain Cookies

Sometimes you may need to share cookies across subdomains. For example, if you have `app.example.com` and `auth.example.com`, and if you authenticate on `auth.example.com`, you may want to access the same session on `app.example.com`.

<Callout type="warn">
  The `domain` attribute controls which domains can access the cookie. Setting it to your root domain (e.g. `example.com`) makes the cookie accessible across all subdomains. For security, you should:

  1. Only enable cross-subdomain cookies if it's necessary
  2. Set the domain to the most specific scope needed (e.g. `app.example.com` instead of `.example.com`)
  3. Be cautious of untrusted subdomains that could potentially access these cookies
  4. Consider using separate domains for untrusted services (e.g. `status.company.com` vs `app.company.com`)
</Callout>

```ts title="auth.ts"
import { betterAuth } from "better-auth"

export const auth = betterAuth({
    advanced: {
        crossSubDomainCookies: {
            enabled: true,
            domain: "app.example.com", // your domain
        },
    },
    trustedOrigins: [
        'https://example.com',
        'https://app1.example.com',
        'https://app2.example.com',
    ],
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



# concepts: Database
URL: /docs/concepts/database
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/concepts/database.mdx

Learn how to use a database with Better Auth.
        
***

title: Database
description: Learn how to use a database with Better Auth.
----------------------------------------------------------

## Adapters

Better Auth requires a database connection to store data. The database will be used to store data such as users, sessions, and more. Plugins can also define their own database tables to store data.

You can pass a database connection to Better Auth by passing a supported database instance in the database options. You can learn more about supported database adapters in the [Other relational databases](/docs/adapters/other-relational-databases) documentation.

## CLI

Better Auth comes with a CLI tool to manage database migrations and generate schema.

### Running Migrations

The cli checks your database and prompts you to add missing tables or update existing ones with new columns. This is only supported for the built-in Kysely adapter. For other adapters, you can use the `generate` command to create the schema and handle the migration through your ORM.

```bash
npx @better-auth/cli migrate
```

### Generating Schema

Better Auth also provides a `generate` command to generate the schema required by Better Auth. The `generate` command creates the schema required by Better Auth. If you're using a database adapter like Prisma or Drizzle, this command will generate the right schema for your ORM. If you're using the built-in Kysely adapter, it will generate an SQL file you can run directly on your database.

```bash
npx @better-auth/cli generate
```

See the [CLI](/docs/concepts/cli) documentation for more information on the CLI.

<Callout>
  If you prefer adding tables manually, you can do that as well. The core schema
  required by Better Auth is described below and you can find additional schema
  required by plugins in the plugin documentation.
</Callout>

## Secondary Storage

Secondary storage in Better Auth allows you to use key-value stores for managing session data, rate limiting counters, etc. This can be useful when you want to offload the storage of this intensive records to a high performance storage or even RAM.

### Implementation

To use secondary storage, implement the `SecondaryStorage` interface:

```typescript
interface SecondaryStorage {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
}
```

Then, provide your implementation to the `betterAuth` function:

```typescript
betterAuth({
  // ... other options
  secondaryStorage: {
    // Your implementation here
  },
});
```

**Example: Redis Implementation**

Here's a basic example using Redis:

```typescript
import { createClient } from "redis";
import { betterAuth } from "better-auth";

const redis = createClient();
await redis.connect();

export const auth = betterAuth({
  // ... other options
  secondaryStorage: {
    get: async (key) => {
      const value = await redis.get(key);
      return value ? value : null;
    },
    set: async (key, value, ttl) => {
      if (ttl) await redis.set(key, value, { EX: ttl });
      // or for ioredis:
      // if (ttl) await redis.set(key, value, 'EX', ttl)
      else await redis.set(key, value);
    },
    delete: async (key) => {
      await redis.del(key);
    }
  }
});
```

This implementation allows Better Auth to use Redis for storing session data and rate limiting counters. You can also add prefixes to the keys names.

## Core Schema

Better Auth requires the following tables to be present in the database. The types are in `typescript` format. You can use corresponding types in your database.

### User

Table Name: `user`

<DatabaseTable
  fields={[
  {
    name: "id",
    type: "string",
    description: "Unique identifier for each user",
    isPrimaryKey: true,
  },
  {
    name: "name",
    type: "string",
    description: "User's chosen display name",
  },
  {
    name: "email",
    type: "string",
    description: "User's email address for communication and login",
  },
  {
    name: "emailVerified",
    type: "boolean",
    description: "Whether the user's email is verified",
  },
  {
    name: "image",
    type: "string",
    description: "User's image url",
    isOptional: true,
  },
  {
    name: "createdAt",
    type: "Date",
    description: "Timestamp of when the user account was created",
  },
  {
    name: "updatedAt",
    type: "Date",
    description: "Timestamp of the last update to the user's information",
  },
]}
/>

### Session

Table Name: `session`

<DatabaseTable
  fields={[
  {
    name: "id",
    type: "string",
    description: "Unique identifier for each session",
    isPrimaryKey: true,
  },
  {
    name: "userId",
    type: "string",
    description: "The ID of the user",
    isForeignKey: true,
  },
  {
    name: "token",
    type: "string",
    description: "The unique session token",
    isUnique: true,
  },
  {
    name: "expiresAt",
    type: "Date",
    description: "The time when the session expires",
  },
  {
    name: "ipAddress",
    type: "string",
    description: "The IP address of the device",
    isOptional: true,
  },
  {
    name: "userAgent",
    type: "string",
    description: "The user agent information of the device",
    isOptional: true,
  },
  {
    name: "createdAt",
    type: "Date",
    description: "Timestamp of when the session was created",
  },
  {
    name: "updatedAt",
    type: "Date",
    description: "Timestamp of when the session was updated",
  },
]}
/>

### Account

Table Name: `account`

<DatabaseTable
  fields={[
  {
    name: "id",
    type: "string",
    description: "Unique identifier for each account",
    isPrimaryKey: true,
  },
  {
    name: "userId",
    type: "string",
    description: "The ID of the user",
    isForeignKey: true,
  },
  {
    name: "accountId",
    type: "string",
    description:
      "The ID of the account as provided by the SSO or equal to userId for credential accounts",
  },
  {
    name: "providerId",
    type: "string",
    description: "The ID of the provider",
  },
  {
    name: "accessToken",
    type: "string",
    description: "The access token of the account. Returned by the provider",
    isOptional: true,
  },
  {
    name: "refreshToken",
    type: "string",
    description: "The refresh token of the account. Returned by the provider",
    isOptional: true,
  },
  {
    name: "accessTokenExpiresAt",
    type: "Date",
    description: "The time when the access token expires",
    isOptional: true,
  },
  {
    name: "refreshTokenExpiresAt",
    type: "Date",
    description: "The time when the refresh token expires",
    isOptional: true,
  },
  {
    name: "scope",
    type: "string",
    description: "The scope of the account. Returned by the provider",
    isOptional: true,
  },
  {
    name: "idToken",
    type: "string",
    description: "The ID token returned from the provider",
    isOptional: true,
  },
  {
    name: "password",
    type: "string",
    description:
      "The password of the account. Mainly used for email and password authentication",
    isOptional: true,
  },
  {
    name: "createdAt",
    type: "Date",
    description: "Timestamp of when the account was created",
  },
  {
    name: "updatedAt",
    type: "Date",
    description: "Timestamp of when the account was updated",
  },
]}
/>

### Verification

Table Name: `verification`

<DatabaseTable
  fields={[
  {
    name: "id",
    type: "string",
    description: "Unique identifier for each verification",
    isPrimaryKey: true,
  },
  {
    name: "identifier",
    type: "string",
    description: "The identifier for the verification request",
  },
  {
    name: "value",
    type: "string",
    description: "The value to be verified",
  },
  {
    name: "expiresAt",
    type: "Date",
    description: "The time when the verification request expires",
  },
  {
    name: "createdAt",
    type: "Date",
    description: "Timestamp of when the verification request was created",
  },
  {
    name: "updatedAt",
    type: "Date",
    description: "Timestamp of when the verification request was updated",
  },
]}
/>

# concepts: Session Management
URL: /docs/concepts/session-management
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/concepts/session-management.mdx

Better Auth session management.
        
***

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

```ts title="auth-client.ts"
import { authClient } from "@/lib/client"

const sessions = await authClient.listSessions()
```

### Revoke Session

When a user signs out of a device, the session is automatically ended. However, you can also end a session manually from any device the user is signed into.

To end a session, use the `revokeSession` function. Just pass the session token as a parameter.

```ts title="auth-client.ts"
await authClient.revokeSession({
    token: "session-token"
})
```

### Revoke Other Sessions

To revoke all other sessions except the current session, you can use the `revokeOtherSessions` function.

```ts title="auth-client.ts"
await authClient.revokeOtherSessions()
```

### Revoke All Sessions

To revoke all sessions, you can use the `revokeSessions` function.

```ts title="auth-client.ts"
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

```ts title="auth-client.ts"
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
        
***

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

```ts title="auth-client.ts" 
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
        
***

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
        
***

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
    import { admin } from "better-auth/plugins" // [!code highlight]

    export const auth = betterAuth({
        // ... other config options
        plugins: [
            admin() // [!code highlight]
        ]
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

    ```ts title="auth-client.ts"
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
      /**
       * The email of the user. 
       */
      email: string = "user@example.com"
      /**
       * The password of the user. 
       */
      password: string = "some-secure-password"
      /**
       * The name of the user. 
       */
      name: string = "James Smith"
      /**
       * A string or array of strings representing the roles to apply to the new user. 
       */
      role?: string | string[] = "user"
      /**
       * Extra fields for the user. Including custom additional fields. 
       */
      data?: Record<string, any> = { customField: "customValue" }
  }
  ```
</APIMethod>

### List Users

Allows an admin to list all users in the database.

<APIMethod path="/admin/list-users" method="GET" requireSession note={"All properties are optional to configure. By default, 100 rows are returned, you can configure this by the `limit` property."} resultVariable={"users"}>
  ```ts
  type listUsers = {
      /**
       * The value to search for. 
       */
      searchValue?: string = "some name"
      /**
       * The field to search in, defaults to email. Can be `email` or `name`. 
       */
      searchField?: "email" | "name" = "name"
      /**
       * The operator to use for the search. Can be `contains`, `starts_with` or `ends_with`. 
       */
      searchOperator?: "contains" | "starts_with" | "ends_with" = "contains"
      /**
       * The number of users to return. Defaults to 100.
       */
      limit?: string | number = 100
      /**
       * The offset to start from. 
       */
      offset?: string | number = 100
      /**
       * The field to sort by. 
       */
      sortBy?: string = "name"
      /**
       * The direction to sort by. 
       */
      sortDirection?: "asc" | "desc" = "desc"
      /**
       * The field to filter by. 
       */
      filterField?: string = "email"
      /**
       * The value to filter by. 
       */
      filterValue?: string | number | boolean = "hello@example.com"
      /**
       * The operator to use for the filter. 
       */
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
      /**
       * The user id which you want to set the role for.
       */
      userId?: string = "user-id"
      /**
       * The role to set, this can be a string or an array of strings. 
       */
      role: string | string[] = "admin"
  }
  ```
</APIMethod>

### Set User Password

Changes the password of a user.

<APIMethod path="/admin/set-user-password" method="POST" requireSession>
  ```ts
  type setUserPassword = {
      /**
       * The new password. 
       */
      newPassword: string = 'new-password'
      /**
       * The user id which you want to set the password for.
       */
      userId: string = 'user-id'
  }
  ```
</APIMethod>

### List User Sessions

Lists all sessions for a user.

<APIMethod path="/admin/list-user-sessions" method="POST" requireSession>
  ```ts
  type listUserSessions = {
      /**
       * The user id. 
       */
      userId: string = "user-id"
  }
  ```
</APIMethod>

### Revoke User Session

Revokes a specific session for a user.

<APIMethod path="/admin/revoke-user-session" method="POST" requireSession>
  ```ts
  type revokeUserSession = {
      /**
       * The session token which you want to revoke. 
       */
      sessionToken: string = "session_token_here"
  }
  ```
</APIMethod>

### Revoke All Sessions for a User

Revokes all sessions for a user.

<APIMethod path="/admin/revoke-user-sessions" method="POST" requireSession>
  ```ts
  type revokeUserSessions = {
      /**
       * The user id which you want to revoke all sessions for. 
       */
      userId: string = "user-id"
  }
  ```
</APIMethod>

### Remove User

Hard deletes a user from the database.

<APIMethod path="/admin/remove-user" method="POST" requireSession resultVariable="deletedUser">
  ```ts
  type removeUser = {
      /**
       * The user id which you want to remove. 
       */
      userId: string = "user-id"
  }
  ```
</APIMethod>

## Access Control

The admin plugin offers a highly flexible access control system, allowing you to manage user permissions based on their role. You can define custom permission sets to fit your needs.

### Roles

By default, there are two roles:

`admin`: Users with the admin role have full control over other users.

`user`: Users with the user role have no control over other users.

<Callout>
  A user can have multiple roles. Multiple roles are stored as string separated by comma (",").
</Callout>

### Permissions

By default, there are two resources with up to six permissions.

**user**:
`create` `list` `set-role` `ban` `impersonate` `delete` `set-password`

**session**:
`list` `revoke` `delete`

Users with the admin role have full control over all the resources and actions. Users with the user role have no control over any of those actions.

### Custom Permissions

The plugin provides an easy way to define your own set of permissions for each role.

<Steps>
  <Step>
    #### Create Access Control

    You first need to create an access controller by calling the `createAccessControl` function and passing the statement object. The statement object should have the resource name as the key and the array of actions as the value.

    ```ts title="permissions.ts"
    import { createAccessControl } from "better-auth/plugins/access";

    /**
     * make sure to use `as const` so typescript can infer the type correctly
     */
    const statement = { // [!code highlight]
        project: ["create", "share", "update", "delete"], // [!code highlight]
    } as const; // [!code highlight]

    const ac = createAccessControl(statement); // [!code highlight]
    ```
  </Step>

  <Step>
    #### Create Roles

    Once you have created the access controller you can create roles with the permissions you have defined.

    ```ts title="permissions.ts"
    import { createAccessControl } from "better-auth/plugins/access";

    export const statement = {
        project: ["create", "share", "update", "delete"], // <-- Permissions available for created roles
    } as const;

    const ac = createAccessControl(statement);

    export const user = ac.newRole({ // [!code highlight]
        project: ["create"], // [!code highlight]
    }); // [!code highlight]

    export const admin = ac.newRole({ // [!code highlight]
        project: ["create", "update"], // [!code highlight]
    }); // [!code highlight]

    export const myCustomRole = ac.newRole({ // [!code highlight]
        project: ["create", "update", "delete"], // [!code highlight]
        user: ["ban"], // [!code highlight]
    }); // [!code highlight]
    ```

    When you create custom roles for existing roles, the predefined permissions for those roles will be overridden. To add the existing permissions to the custom role, you need to import `defaultStatements` and merge it with your new statement, plus merge the roles' permissions set with the default roles.

    ```ts title="permissions.ts"
    import { createAccessControl } from "better-auth/plugins/access";
    import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

    const statement = {
        ...defaultStatements, // [!code highlight]
        project: ["create", "share", "update", "delete"],
    } as const;

    const ac = createAccessControl(statement);

    const admin = ac.newRole({
        project: ["create", "update"],
        ...adminAc.statements, // [!code highlight]
    });
    ```
  </Step>

  <Step>
    #### Pass Roles to the Plugin

    Once you have created the roles you can pass them to the admin plugin both on the client and the server.

    ```ts title="auth.ts"
    import { betterAuth } from "better-auth"
    import { admin as adminPlugin } from "better-auth/plugins"
    import { ac, admin, user } from "@/auth/permissions"

    export const auth = betterAuth({
        plugins: [
            adminPlugin({
                ac,
                roles: {
                    admin,
                    user,
                    myCustomRole
                }
            }),
        ],
    });
    ```

    You also need to pass the access controller and the roles to the client plugin.

    ```ts title="auth-client.ts"
    import { createAuthClient } from "better-auth/client"
    import { adminClient } from "better-auth/client/plugins"
    import { ac, admin, user, myCustomRole } from "@/auth/permissions"

    export const client = createAuthClient({
        plugins: [
            adminClient({
                ac,
                roles: {
                    admin,
                    user,
                    myCustomRole
                }
            })
        ]
    })
    ```
  </Step>
</Steps>

### Access Control Usage

**Has Permission**:

To check a user's permissions, you can use the `hasPermission` function provided by the client.

<APIMethod path="/admin/has-permission" method="POST">
  ```ts
  type userHasPermission = {
      /**
       * The user id which you want to check the permissions for. 
       */
      userId?: string = "user-id"
      /**
       * Check role permissions.
       * @serverOnly
       */
      role?: string = "admin"
      /**
       * Optionally check if a single permission is granted. Must use this, or permissions. 
       */
      permission?: Record<string, string[]> = { "project": ["create", "update"] } /* Must use this, or permissions */,
      /**
       * Optionally check if multiple permissions are granted. Must use this, or permission. 
       */
      permissions?: Record<string, string[]>
  }
  ```
</APIMethod>

Example usage:

```ts title="auth-client.ts"
const canCreateProject = await authClient.admin.hasPermission({
  permissions: {
    project: ["create"],
  },
});

// You can also check multiple resource permissions at the same time
const canCreateProjectAndCreateSale = await authClient.admin.hasPermission({
  permissions: {
    project: ["create"],
    sale: ["create"]
  },
});
```

If you want to check a user's permissions server-side, you can use the `userHasPermission` action provided by the `api` to check the user's permissions.

```ts title="api.ts"
import { auth } from "@/auth";

await auth.api.userHasPermission({
  body: {
    userId: 'id', //the user id
    permissions: {
      project: ["create"], // This must match the structure in your access control
    },
  },
});

// You can also just pass the role directly
await auth.api.userHasPermission({
  body: {
   role: "admin",
    permissions: {
      project: ["create"], // This must match the structure in your access control
    },
  },
});

// You can also check multiple resource permissions at the same time
await auth.api.userHasPermission({
  body: {
   role: "admin",
    permissions: {
      project: ["create"], // This must match the structure in your access control
      sale: ["create"]
    },
  },
});
```

**Check Role Permission**:

Use the `checkRolePermission` function on the client side to verify whether a given **role** has a specific **permission**. This is helpful after defining roles and their permissions, as it allows you to perform permission checks without needing to contact the server.

Note that this function does **not** check the permissions of the currently logged-in user directly. Instead, it checks what permissions are assigned to a specified role. The function is synchronous, so you don't need to use `await` when calling it.

```ts title="auth-client.ts"
const canCreateProject = authClient.admin.checkRolePermission({
  permissions: {
    user: ["delete"],
  },
  role: "admin",
});

// You can also check multiple resource permissions at the same time
const canDeleteUserAndRevokeSession = authClient.admin.checkRolePermission({
  permissions: {
    user: ["delete"],
    session: ["revoke"]
  },
  role: "admin",
});
```

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
        
***

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

    ```ts title="auth-client.ts"
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
      /**
       * Email address to send the magic link. 
       */
      email: string = "user@email.com"
      /**
       * User display name. Only used if the user is registering for the first time. 
       */
      name?: string = "my-name"
      /**
       * URL to redirect after magic link verification. 
       */
      callbackURL?: string = "/dashboard"
      /**
       * URL to redirect after new user signup
       */
      newUserCallbackURL?: string = "/welcome"
      /**
       * URL to redirect if an error happen on verification
       * If only callbackURL is provided but without an `errorCallbackURL` then they will be 
       * redirected to the callbackURL with an `error` query parameter.
       */
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
      /**
       * Verification token. 
       */
      token: string = "123456"
      /**
       * URL to redirect after magic link verification, if not provided will return the session. 
       */
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


