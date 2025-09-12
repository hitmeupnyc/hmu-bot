import { sdk as serverSdk } from 'api-server/sdk';

// Re-export the SDK instance configured for client use
// The server SDK is already configured with the correct base URL
export const sdk = serverSdk;