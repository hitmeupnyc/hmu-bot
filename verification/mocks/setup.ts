import { beforeAll, afterEach, afterAll } from "vitest";
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

// Create MSW server instance
export const server = setupServer(...handlers);

// Global test setup for MSW
beforeAll(() => {
  // Start the server before all tests
  server.listen({
    // Fail tests if there's an unhandled request
    onUnhandledRequest: "error",
  });
});

afterEach(() => {
  // Reset any request handlers that may have been added during tests
  server.resetHandlers();
});

afterAll(() => {
  // Clean up after all tests are done
  server.close();
});
