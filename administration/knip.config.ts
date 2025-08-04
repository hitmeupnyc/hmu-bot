import { KnipConfig } from 'knip';

const config: KnipConfig = {
  // Workspaces in this monorepo
  workspaces: {
    '.': {
      // Root workspace configuration
      entry: ['turbo.json'],
      project: ['**/*.{js,ts,tsx,jsx}'],
      ignore: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
    },
    'client': {
      // React client workspace
      entry: [
        'src/main.tsx',
      ],
      project: ['src/**/*.{ts,tsx}', '*.{ts,js}'],
      ignore: ['dist/**', 'node_modules/**'],
    },
    'server': {
      // Node.js server workspace
      entry: [
        'src/**/*.test.ts',
        'src/scripts/*.ts',
        'kysely.config.ts',
        'src/seeds/*.ts', // Kysely seed files
      ],
      project: ['src/**/*.ts', '*.ts'],
      ignore: ['dist/**', 'node_modules/**'],
    },
    'tests': {
      // E2E tests workspace
      entry: [
        'e2e/**/*.spec.ts',
        'global-setup.ts',
      ],
      project: ['**/*.ts'],
      ignore: ['node_modules/**', 'test-results/**', 'playwright-report/**'],
    },
  },
  
  // Global ignore patterns
  ignore: [
    // Build outputs
    '**/dist/**',
    '**/coverage/**',
    '**/node_modules/**',
    
    // Database files
    '**/*.db',
    '**/*.db-*',
    
    // Logs
    '**/logs/**',
    
    // Generated files
    '**/playwright-report/**',
    '**/test-results/**',
    
    // Database migrations (essential infrastructure)
    '**/migrations/**',
    
    // WIP Effect system - keep everything alive
    '**/services/effect/**',
    
    // Type definitions - useful reference for Effect migration
    '**/types/**',
  ],
  
  // Plugin configurations
  eslint: true,
  vitest: true,
  playwright: true,
  
  // Rules configuration
  rules: {
    // Configure specific rule types
    'exports': 'warn',
    'files': 'warn', 
    'dependencies': 'error',
    'unlisted': 'error',
  },
  
  // Ignore specific patterns for dependencies we want to keep
  ignoreDependencies: [
    // Redis used by job scheduler
    'redis',
    // Klaviyo API used by sync services  
    'klaviyo-api',
    
    // ESLint plugins for dead code detection (our tooling)
    'eslint-plugin-import',
    'eslint-plugin-unused-imports', 
    'eslint-config-standard',
    'eslint-plugin-react-hooks',
    'eslint-plugin-react-refresh',
    
    // Prettier plugin used in configuration
    'prettier-plugin-organize-imports',
  ],
};

export default config;
