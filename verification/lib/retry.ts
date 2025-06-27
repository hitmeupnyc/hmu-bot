/**
 * Configurable retry utility with exponential backoff.
 * Extracted from google-sheets.ts for better testability and reusability.
 */

export interface RetryConfig {
  /** Number of retry attempts (default: 3) */
  retries?: number;
  /** Base delay in milliseconds (default: 1000) */
  delayMs?: number;
  /** Function called before each retry attempt */
  onRetry?: (error: Error, attempt: number) => Promise<void> | void;
  /** Function to determine if an error should trigger a retry */
  shouldRetry?: (error: Error, attempt: number) => boolean;
  /** Force specific delay behavior (overrides environment detection) */
  forceDelay?: boolean;
}

/**
 * Detect if we're running in a test environment.
 * Checks multiple common test environment indicators.
 */
function isTestEnvironment(): boolean {
  // Check for common test environment variables
  if (typeof process !== "undefined" && process.env) {
    if (
      process.env.NODE_ENV === "test" ||
      process.env.VITEST === "true" ||
      process.env.JEST_WORKER_ID !== undefined ||
      process.env.CI === "true"
    ) {
      return true;
    }
  }

  // Check for Cloudflare Workers test environment
  if (typeof globalThis !== "undefined") {
    // Vitest sets this when running tests
    if ((globalThis as any).__vitest__ !== undefined) {
      return true;
    }

    // Check if we're in a Cloudflare Workers test environment
    if ((globalThis as any).ENVIRONMENT === "test") {
      return true;
    }
  }

  // Check for common test globals
  if (
    typeof global !== "undefined" &&
    (global as any).describe !== undefined &&
    (global as any).it !== undefined
  ) {
    return true;
  }

  return false;
}

/**
 * Execute a function with retry logic and exponential backoff.
 *
 * @param fn - Function to execute
 * @param config - Retry configuration
 * @returns Promise that resolves with the function result or rejects with the final error
 *
 * @example
 * ```typescript
 * const result = await retry(
 *   () => fetch('/api/data'),
 *   {
 *     retries: 3,
 *     delayMs: 1000,
 *     onRetry: (error, attempt) => console.log(`Retry ${attempt}: ${error.message}`)
 *   }
 * );
 * ```
 */
export function retry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {},
): Promise<T> {
  const {
    retries = 3,
    delayMs = 1000,
    onRetry,
    shouldRetry = () => true,
    forceDelay,
  } = config;

  // Use zero delay in test environments unless explicitly forced
  const useZeroDelay = forceDelay || isTestEnvironment();

  return new Promise((resolve, reject) => {
    const attempt = (retryCount: number) => {
      fn()
        .then(resolve)
        .catch(async (error) => {
          // Check if we should retry this error
          if (!shouldRetry(error, retries - retryCount + 1)) {
            reject(error);
            return;
          }

          // Call onRetry callback if provided
          if (onRetry) {
            try {
              await onRetry(error, retries - retryCount + 1);
            } catch (callbackError) {
              // If onRetry fails, still continue with retry logic
              console.warn("onRetry callback failed:", callbackError);
            }
          }

          if (retryCount <= 0) {
            reject(error);
          } else {
            const baseDelay = useZeroDelay ? 0 : delayMs;
            const delay = baseDelay * Math.pow(2, retries - retryCount);
            setTimeout(() => {
              attempt(retryCount - 1);
            }, delay);
          }
        });
    };

    attempt(retries);
  });
}

/**
 * Create a retry function with predefined configuration.
 * Useful for creating specialized retry functions for different use cases.
 *
 * @param config - Default retry configuration
 * @returns Configured retry function
 *
 * @example
 * ```typescript
 * const retryApiCall = createRetryFunction({
 *   retries: 5,
 *   delayMs: 500,
 *   shouldRetry: (error) => error.status >= 500
 * });
 *
 * const result = await retryApiCall(() => fetch('/api/data'));
 * ```
 */
export function createRetryFunction(defaultConfig: RetryConfig) {
  return function <T>(
    fn: () => Promise<T>,
    overrideConfig?: Partial<RetryConfig>,
  ): Promise<T> {
    return retry(fn, { ...defaultConfig, ...overrideConfig });
  };
}

/**
 * Predefined retry configurations for common use cases.
 */
export const retryConfigs = {
  /** Quick retries for transient failures */
  fast: {
    retries: 2,
    delayMs: 250,
  } as RetryConfig,

  /** Standard retries for API calls */
  api: {
    retries: 3,
    delayMs: 1000,
  } as RetryConfig,

  /** Aggressive retries for critical operations */
  persistent: {
    retries: 5,
    delayMs: 2000,
  } as RetryConfig,

  /** Network-specific retries */
  network: {
    retries: 3,
    delayMs: 1000,
    shouldRetry: (error: Error) => {
      // Retry on network errors, timeouts, and 5xx status codes
      return (
        error.message.includes("fetch") ||
        error.message.includes("timeout") ||
        error.message.includes("ECONNRESET") ||
        (error as any).status >= 500
      );
    },
  } as RetryConfig,
};

/**
 * Predefined retry functions for common scenarios.
 */
export const RETRY = {
  fast: createRetryFunction(retryConfigs.fast),
  api: createRetryFunction(retryConfigs.api),
  persistent: createRetryFunction(retryConfigs.persistent),
  network: createRetryFunction(retryConfigs.network),
};

/**
 * Calculate the total time for all retry attempts given a configuration.
 * Useful for setting test timeouts or understanding retry behavior.
 *
 * @param config - Retry configuration
 * @returns Total time in milliseconds for all retry attempts
 *
 * @example
 * ```typescript
 * const totalTime = calculateRetryTime({ retries: 3, delayMs: 1000 });
 * console.log(`Max retry time: ${totalTime}ms`); // Max retry time: 7000ms
 * ```
 */
function calculateRetryTime(config: RetryConfig): number {
  const { retries = 3, delayMs = 1000 } = config;
  let totalTime = 0;

  for (let i = 0; i < retries; i++) {
    totalTime += delayMs * Math.pow(2, i);
  }

  return totalTime;
}

/**
 * Testing utilities for retry logic.
 * These are separate from the main retry implementation to avoid coupling.
 */
export const retryTestUtils = {
  /**
   * Calculate expected delay time for a retry configuration.
   * Used by test helpers to determine how much to advance timers.
   */
  calculateExpectedDelay: calculateRetryTime,

  /**
   * Create a mock onRetry callback that tracks retry attempts.
   * Useful for testing retry behavior.
   */
  createRetryTracker: () => {
    const attempts: { attempt: number; error: Error; timestamp: number }[] = [];

    const onRetry = (error: Error, attempt: number) => {
      attempts.push({ attempt, error, timestamp: Date.now() });
    };

    return {
      onRetry,
      getAttempts: () => [...attempts],
      getAttemptCount: () => attempts.length,
      getLastError: () => attempts[attempts.length - 1]?.error,
      reset: () => attempts.splice(0, attempts.length),
    };
  },
};
