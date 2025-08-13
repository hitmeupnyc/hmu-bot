# Better Auth Integration Plan for HMU Administration

## Executive Summary
This document outlines the integration plan for Better Auth with Magic Link authentication into the HMU Administration application. The integration will provide secure, email-based authentication without passwords, serving as two-factor authentication.

## Current Architecture Analysis

### Database
- **ORM**: Kysely with SQLite
- **Config**: `/server/kysely.config.ts`
- **Layer**: Effect-TS based DatabaseLayer at `/server/src/services/effect/layers/DatabaseLayer.ts`
- **Database Path**: `./data/club.db` (configurable via `DATABASE_PATH`)

### Server Stack
- **Framework**: Express.js
- **Architecture**: Effect-TS for service layer
- **Port**: 3000 (configurable)
- **Client URL**: http://localhost:5173

### Key Observations
- Already using better-sqlite3 (compatible with Better Auth)
- Effect-TS service architecture can cleanly integrate with Better Auth
- Existing database migration system via Kysely

## Phase 1: Core Better Auth Setup

### 1.1 Installation & Configuration
```bash
# Install Better Auth and Magic Link plugin
npm install better-auth
```

### 1.2 Create Auth Instance
Create `/server/src/auth.ts`:
```typescript
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import Database from "better-sqlite3";
import path from "path";

const dbPath = process.env.DATABASE_PATH || 
  path.join(__dirname, '../data/club.db');

export const auth = betterAuth({
  database: new Database(dbPath),
  
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  
  emailAndPassword: {
    enabled: false, // We only use magic links
  },
  
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url, token }, request) => {
        // Stub for Phase 2 - will be replaced with actual email service
        console.log(`[EMAIL STUB] Send magic link to ${email}: ${url}`);
        // TODO: Integrate with email service
      },
      expiresIn: 60 * 15, // 15 minutes
    }),
  ],
  
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session if older than 1 day
  },
  
  trustedOrigins: [
    process.env.CLIENT_URL || "http://localhost:5173"
  ],
});
```

### 1.3 Mount Auth Routes
Update `/server/src/index.ts`:
```typescript
import { auth } from './auth';
import { toNodeHandler } from "better-auth/node";

// After existing middleware setup, before other routes
app.all("/api/auth/*", toNodeHandler(auth));
```

## Phase 2: Database Schema Migration

### 2.1 Generate Better Auth Schema
```bash
npx @better-auth/cli generate --config ./src/auth.ts
```

This will generate Kysely migrations for:
- `user` table
- `session` table  
- `account` table
- `magicLink` table (from plugin)

### 2.2 Apply Migrations
```bash
npx @better-auth/cli migrate --config ./src/auth.ts
```

### 2.3 Update Database Types
Regenerate types after migration:
```bash
npm run db:codegen
```

## Phase 3: Email Service Integration (Placeholder)

### 3.1 Create Email Service Interface
Create `/server/src/services/effect/EmailService.ts`:
```typescript
import { Effect, Layer } from 'effect';

export interface EmailService {
  sendMagicLink: (to: string, magicLinkUrl: string) => Effect.Effect<void, Error>;
}

export const EmailService = Effect.Tag<EmailService>("EmailService");

// Stub implementation for development
export const EmailServiceStub = Layer.succeed(
  EmailService,
  {
    sendMagicLink: (to, url) => 
      Effect.sync(() => {
        console.log(`[EMAIL STUB] Would send to ${to}: ${url}`);
      })
  }
);
```

### 3.2 Wire Email Service to Better Auth
Update auth configuration to use the service:
```typescript
// In auth.ts
sendMagicLink: async ({ email, url, token }, request) => {
  // This will be replaced when email service is implemented
  await Effect.runPromise(
    emailService.sendMagicLink(email, url).pipe(
      Effect.provide(EmailServiceStub)
    )
  );
}
```

## Phase 4: Client Integration

### 4.1 Install Client Library
```bash
# In the client directory
npm install better-auth
```

### 4.2 Create Auth Client
Create `/client/src/lib/auth-client.ts`:
```typescript
import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  plugins: [
    magicLinkClient()
  ]
});

export const { 
  signIn,
  signOut,
  useSession 
} = authClient;
```

### 4.3 Add Auth Components
Create login component with magic link:
```typescript
// /client/src/components/auth/MagicLinkLogin.tsx
import { useState } from 'react';
import { signIn } from '@/lib/auth-client';

export function MagicLinkLogin() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn.magicLink({ 
      email,
      callbackURL: '/dashboard'
    });
    setSent(true);
  };
  
  if (sent) {
    return <div>Check your email for the magic link!</div>;
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
      />
      <button type="submit">Send Magic Link</button>
    </form>
  );
}
```

## Phase 5: Organizations Plugin (Future Enhancement)

When ready to add multi-tenancy:

### 5.1 Add Organizations Plugin
```typescript
import { organization } from "better-auth/plugins";

// In auth.ts plugins array
organization({
  allowUserToCreateOrganization: true,
  organizationLimit: 5,
})
```

### 5.2 Update Schema
```bash
npx @better-auth/cli generate
npx @better-auth/cli migrate
```

This will add:
- `organization` table
- `member` table (org membership)
- `invitation` table

## Implementation Checklist

### Immediate Actions (Phase 1-2)
- [ ] Install better-auth package
- [ ] Create auth.ts configuration file
- [ ] Mount auth routes in Express app
- [ ] Generate Better Auth database schema
- [ ] Run database migrations
- [ ] Update TypeScript database types

### Development Setup (Phase 3)
- [ ] Create email service stub for development
- [ ] Configure magic link with stub service
- [ ] Add logging for development testing

### Client Integration (Phase 4)
- [ ] Install better-auth client package
- [ ] Create auth client with magic link plugin
- [ ] Build login/logout components
- [ ] Add session management hooks
- [ ] Protect routes with authentication

### Production Readiness
- [ ] Implement actual email service
- [ ] Configure production database
- [ ] Set up environment variables
- [ ] Add rate limiting for auth endpoints
- [ ] Configure session management
- [ ] Test magic link flow end-to-end

### Future Enhancements
- [ ] Add organizations plugin when needed
- [ ] Implement role-based access control
- [ ] Add audit logging for auth events
- [ ] Set up monitoring and analytics

## Environment Variables

Add to `.env`:
```bash
# Better Auth
BETTER_AUTH_SECRET=<generate-with-cli>
BETTER_AUTH_URL=http://localhost:3000

# Email Service (to be configured)
EMAIL_FROM=noreply@hmu.club
EMAIL_PROVIDER=<provider-name>
# Provider-specific configs...
```

Generate secret:
```bash
npx @better-auth/cli secret
```

## Security Considerations

1. **Magic Links**: 15-minute expiration, single-use tokens
2. **Sessions**: 7-day expiration with rolling updates
3. **CORS**: Configured for trusted origins only
4. **Cookies**: HttpOnly, Secure, SameSite=Lax
5. **Rate Limiting**: Apply to /api/auth/* endpoints
6. **Audit**: Log all authentication events

## Migration Path from Current System

Since this is a new authentication system:
1. No existing user migration needed
2. Start with admin users first
3. Gradually roll out to different user types
4. Keep existing member management separate initially

## Testing Strategy

1. **Unit Tests**: Auth configuration and helpers
2. **Integration Tests**: Magic link flow with stub email
3. **E2E Tests**: Full authentication flow with Playwright
4. **Security Tests**: Token expiration, session management

## Notes for Implementation

- Email service implementation is out of scope but stubbed for development
- Organizations plugin can be added later without breaking changes
- Database already supports Better Auth's SQLite requirements
- Effect-TS integration provides clean error handling
- Consider adding auth middleware for API routes after implementation