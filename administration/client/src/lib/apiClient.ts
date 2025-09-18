import type { paths } from 'api-server/types';
import createClient from 'openapi-fetch';

// Create the typed client
export const apiClient = createClient<paths>({
  baseUrl: process.env.API_BASE_URL || 'http://localhost:5173',
});
