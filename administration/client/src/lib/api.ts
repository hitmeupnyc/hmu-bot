import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include session ID for audit logging
api.interceptors.request.use((config) => {
  // Get or create session ID for audit tracking
  let sessionId = sessionStorage.getItem('audit-session-id');
  if (!sessionId) {
    sessionId = uuidv4();
    sessionStorage.setItem('audit-session-id', sessionId);
  }
  
  config.headers['x-session-id'] = sessionId;
  return config;
});

// Add response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      console.warn('Unauthorized access');
    } else if (error.response?.status >= 500) {
      // Handle server errors
      console.error('Server error:', error.response.data);
    }
    return Promise.reject(error);
  }
);

