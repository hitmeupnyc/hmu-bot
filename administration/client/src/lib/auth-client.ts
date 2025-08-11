import { createAuthClient } from 'better-auth/react';
import { magicLinkClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: 'http://localhost:3000', // Use explicit URL for now
  plugins: [
    magicLinkClient(),
  ],
});

// Export commonly used methods for easier imports
export const {
  signIn,
  signOut,
  useSession,
  getSession,
} = authClient;