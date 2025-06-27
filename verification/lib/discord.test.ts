import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/setup";
import { fetchEmailFromCode, grantRole } from "./discord";
import {
  discordTestData,
  oauthResponses,
  userResponses,
  createOAuthTestParams,
  createRoleGrantParams,
} from "../fixtures/discord-data";

describe("Discord Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console mocks
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("OAuth Token Exchange", () => {
    it("successfully exchanges valid authorization code for access token", async () => {
      const params = createOAuthTestParams(discordTestData.validOAuthCode);

      const result = await fetchEmailFromCode(
        params.code,
        params.clientId,
        params.clientSecret,
        params.oauthDestination,
      );

      expect(result.id).toBe(discordTestData.verifiedUser.id);
      expect(result.email).toBe(discordTestData.verifiedUser.email);
      expect(result.verified).toBe(true);
    });

    it("handles invalid authorization code", async () => {
      const params = createOAuthTestParams(discordTestData.invalidOAuthCode);

      const result = await fetchEmailFromCode(
        params.code,
        params.clientId,
        params.clientSecret,
        params.oauthDestination,
      );

      expect(result.id).toBeUndefined();
      expect(result.email).toBeUndefined();
      expect(result.verified).toBeUndefined();
    });

    it("handles expired authorization code", async () => {
      // Use dynamic override for expired code scenario
      server.use(
        http.post(
          "https://discord.com/api/oauth2/token",
          async ({ request }) => {
            const body = await request.text();
            if (body.includes("expired-oauth-code")) {
              return HttpResponse.json(oauthResponses.expiredCodeResponse, {
                status: 400,
              });
            }
            return HttpResponse.json(oauthResponses.validTokenResponse);
          },
        ),
      );

      const params = createOAuthTestParams("expired-oauth-code");

      const result = await fetchEmailFromCode(
        params.code,
        params.clientId,
        params.clientSecret,
        params.oauthDestination,
      );

      expect(result.id).toBeUndefined();
      expect(result.email).toBeUndefined();
      expect(result.verified).toBeUndefined();
    });

    it("handles network errors during token exchange", async () => {
      // Use dynamic override for network error
      server.use(
        http.post("https://discord.com/api/oauth2/token", () => {
          return HttpResponse.error();
        }),
      );

      const params = createOAuthTestParams("network-error-code");

      const result = await fetchEmailFromCode(
        params.code,
        params.clientId,
        params.clientSecret,
        params.oauthDestination,
      );

      expect(result.id).toBe("");
      expect(result.email).toBe("");
      expect(result.verified).toBe(false);
    });

    it("validates OAuth request parameters", async () => {
      const capturedRequests: string[] = [];

      server.use(
        http.post(
          "https://discord.com/api/oauth2/token",
          async ({ request }) => {
            const body = await request.text();
            capturedRequests.push(body);

            // Verify request contains required parameters
            expect(body).toContain(`client_id=${discordTestData.testClientId}`);
            expect(body).toContain(
              `client_secret=${discordTestData.testClientSecret}`,
            );
            expect(body).toContain("grant_type=authorization_code");
            expect(body).toContain(`code=${discordTestData.validOAuthCode}`);
            expect(body).toContain(
              `redirect_uri=${encodeURIComponent(
                discordTestData.testOAuthDestination,
              )}`,
            );

            return HttpResponse.json(oauthResponses.validTokenResponse);
          },
        ),
      );

      const params = createOAuthTestParams();
      await fetchEmailFromCode(
        params.code,
        params.clientId,
        params.clientSecret,
        params.oauthDestination,
      );

      expect(capturedRequests).toHaveLength(1);
    });
  });

  describe("User Data Retrieval", () => {
    it("retrieves user data with verified email", async () => {
      const params = createOAuthTestParams();

      const result = await fetchEmailFromCode(
        params.code,
        params.clientId,
        params.clientSecret,
        params.oauthDestination,
      );

      expect(result.id).toBe(discordTestData.verifiedUser.id);
      expect(result.email).toBe(discordTestData.verifiedUser.email);
      expect(result.verified).toBe(true);
    });

    it("handles unverified email", async () => {
      // Use a special handler that returns unverified user data
      server.use(
        http.post("https://discord.com/api/oauth2/token", () => {
          return HttpResponse.json({
            access_token: "unverified-token",
            token_type: "Bearer",
            expires_in: 3600,
          });
        }),
      );

      const params = createOAuthTestParams("special-unverified-code");

      const result = await fetchEmailFromCode(
        params.code,
        params.clientId,
        params.clientSecret,
        params.oauthDestination,
      );

      expect(result.id).toBe(discordTestData.unverifiedUser.id);
      expect(result.email).toBe(discordTestData.unverifiedUser.email);
      expect(result.verified).toBe(false);
    });

    it("handles missing email permissions", async () => {
      // Use dynamic override to simulate user without email access
      server.use(
        http.get("https://discord.com/api/users/@me", ({ request }) => {
          const authHeader = request.headers.get("Authorization");
          if (authHeader === "Bearer mock-access-token") {
            return HttpResponse.json({
              id: "555666777",
              username: "noemailuser",
              // email field is missing
              verified: true,
            });
          }
          return HttpResponse.json(userResponses.unauthorizedResponse, {
            status: 401,
          });
        }),
      );

      const params = createOAuthTestParams();

      const result = await fetchEmailFromCode(
        params.code,
        params.clientId,
        params.clientSecret,
        params.oauthDestination,
      );

      expect(result.id).toBe("555666777");
      expect(result.email).toBeUndefined();
      expect(result.verified).toBe(true);
    });

    it("validates user identity request headers", async () => {
      const capturedHeaders: string[] = [];

      server.use(
        http.get("https://discord.com/api/users/@me", ({ request }) => {
          const authHeader = request.headers.get("Authorization");
          if (authHeader) {
            capturedHeaders.push(authHeader);
          }

          expect(authHeader).toBe(`Bearer ${discordTestData.validAccessToken}`);

          return HttpResponse.json(userResponses.verifiedUserResponse);
        }),
      );

      const params = createOAuthTestParams();
      await fetchEmailFromCode(
        params.code,
        params.clientId,
        params.clientSecret,
        params.oauthDestination,
      );

      expect(capturedHeaders).toHaveLength(1);
      expect(capturedHeaders[0]).toBe(
        `Bearer ${discordTestData.validAccessToken}`,
      );
    });
  });

  describe("Role Assignment", () => {
    it("successfully grants role to user", async () => {
      const params = createRoleGrantParams();

      const response = await grantRole(
        params.token,
        params.guildId,
        params.roleId,
        params.userId,
      );

      expect(response.status).toBe(204);
      expect(response.ok).toBe(true);
    });

    it("handles unknown role error", async () => {
      const params = createRoleGrantParams(
        discordTestData.testUserId,
        "nonexistent-role",
      );

      const response = await grantRole(
        params.token,
        params.guildId,
        params.roleId,
        params.userId,
      );

      expect(response.status).toBe(404);
      expect(response.ok).toBe(false);
    });

    it("handles banned user error", async () => {
      const params = createRoleGrantParams("banned-user-id");

      const response = await grantRole(
        params.token,
        params.guildId,
        params.roleId,
        params.userId,
      );

      expect(response.status).toBe(403);
      expect(response.ok).toBe(false);
    });

    it("handles unauthorized token", async () => {
      // Use dynamic override for unauthorized scenario - check the actual token value
      server.use(
        http.put(
          "https://discord.com/api/guilds/:guildId/members/:userId/roles/:roleId",
          ({ request }) => {
            const authHeader = request.headers.get("Authorization");
            if (authHeader === "Bot invalid-token") {
              return HttpResponse.json(
                { message: "Unauthorized" },
                { status: 401 },
              );
            }
            return new HttpResponse(null, { status: 204 });
          },
        ),
      );

      const response = await grantRole(
        "invalid-token",
        discordTestData.testGuildId,
        discordTestData.vettedRoleId,
        discordTestData.testUserId,
      );

      expect(response.status).toBe(401);
      expect(response.ok).toBe(false);
    });

    it("validates role assignment request structure", async () => {
      const capturedRequests: {
        url: string;
        method: string;
        headers: Record<string, string>;
      }[] = [];

      server.use(
        http.put(
          "https://discord.com/api/guilds/:guildId/members/:userId/roles/:roleId",
          ({ request, params }) => {
            capturedRequests.push({
              url: request.url,
              method: request.method,
              headers: Object.fromEntries(request.headers.entries()),
            });

            // Verify URL parameters
            expect(params.guildId).toBe(discordTestData.testGuildId);
            expect(params.userId).toBe(discordTestData.testUserId);
            expect(params.roleId).toBe(discordTestData.vettedRoleId);

            // Verify auth header
            expect(request.headers.get("Authorization")).toBe(
              `Bot ${discordTestData.testBotToken}`,
            );

            return new HttpResponse(null, { status: 204 });
          },
        ),
      );

      const params = createRoleGrantParams();
      await grantRole(
        params.token,
        params.guildId,
        params.roleId,
        params.userId,
      );

      expect(capturedRequests).toHaveLength(1);
      expect(capturedRequests[0].method).toBe("PUT");
      expect(capturedRequests[0].headers["authorization"]).toBe(
        `Bot ${discordTestData.testBotToken}`,
      );
    });

    it("logs role assignment attempts", async () => {
      const consoleSpy = vi.spyOn(console, "log");
      const params = createRoleGrantParams();

      await grantRole(
        params.token,
        params.guildId,
        params.roleId,
        params.userId,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        `[discord][grantRole] granting user ${params.userId} role ${params.roleId}`,
      );
    });
  });

  describe("Retry Mechanism", () => {
    it("retries failed requests with exponential backoff", async () => {
      vi.useFakeTimers();
      let attemptCount = 0;

      server.use(
        http.post("https://discord.com/api/oauth2/token", () => {
          attemptCount++;
          if (attemptCount < 3) {
            return HttpResponse.error();
          }
          return HttpResponse.json(oauthResponses.validTokenResponse);
        }),
      );

      const params = createOAuthTestParams();

      const promise = fetchEmailFromCode(
        params.code,
        params.clientId,
        params.clientSecret,
        params.oauthDestination,
      );

      // Fast-forward through retry delays
      await vi.advanceTimersByTimeAsync(10000);

      const result = await promise;

      expect(attemptCount).toBe(3);
      expect(result.id).toBe(discordTestData.verifiedUser.id);

      vi.useRealTimers();
    });

    it("fails after maximum retry attempts", async () => {
      vi.useFakeTimers();
      let attemptCount = 0;

      server.use(
        http.post("https://discord.com/api/oauth2/token", () => {
          attemptCount++;
          return HttpResponse.error();
        }),
      );

      const params = createOAuthTestParams();

      const promise = fetchEmailFromCode(
        params.code,
        params.clientId,
        params.clientSecret,
        params.oauthDestination,
      );

      // Fast-forward through all retry attempts
      await vi.advanceTimersByTimeAsync(30000);

      const result = await promise;

      expect(attemptCount).toBeGreaterThan(1);
      expect(result.id).toBe("");
      expect(result.email).toBe("");
      expect(result.verified).toBe(false);

      vi.useRealTimers();
    });
  });

  describe("Error Handling", () => {
    it("handles malformed OAuth responses", async () => {
      server.use(
        http.post("https://discord.com/api/oauth2/token", () => {
          return HttpResponse.json({ malformed: "response" });
        }),
      );

      const params = createOAuthTestParams();

      const result = await fetchEmailFromCode(
        params.code,
        params.clientId,
        params.clientSecret,
        params.oauthDestination,
      );

      expect(result.id).toBeUndefined();
      expect(result.email).toBeUndefined();
      expect(result.verified).toBeUndefined();
    });

    it("handles malformed user identity responses", async () => {
      server.use(
        http.get("https://discord.com/api/users/@me", () => {
          return HttpResponse.json({ incomplete: "data" });
        }),
      );

      const params = createOAuthTestParams();

      const result = await fetchEmailFromCode(
        params.code,
        params.clientId,
        params.clientSecret,
        params.oauthDestination,
      );

      expect(result.id).toBeUndefined();
      expect(result.email).toBeUndefined();
      expect(result.verified).toBeUndefined();
    });

    it("logs errors during OAuth flow", async () => {
      const consoleSpy = vi.spyOn(console, "error");

      server.use(
        http.post("https://discord.com/api/oauth2/token", () => {
          return HttpResponse.error();
        }),
      );

      const params = createOAuthTestParams();

      await fetchEmailFromCode(
        params.code,
        params.clientId,
        params.clientSecret,
        params.oauthDestination,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "[discord][fetchEmailFromCode]",
        expect.any(Error),
      );
    });
  });

  describe("Rate Limiting", () => {
    it("handles rate limiting responses", async () => {
      server.use(
        http.post("https://discord.com/api/oauth2/token", () => {
          return HttpResponse.json(oauthResponses.rateLimitResponse, {
            status: 429,
          });
        }),
      );

      const params = createOAuthTestParams();

      const result = await fetchEmailFromCode(
        params.code,
        params.clientId,
        params.clientSecret,
        params.oauthDestination,
      );

      expect(result.id).toBeUndefined();
      expect(result.email).toBeUndefined();
      expect(result.verified).toBeUndefined();
    });

    it("handles rate limiting during user data retrieval", async () => {
      server.use(
        http.get("https://discord.com/api/users/@me", () => {
          return HttpResponse.json(userResponses.rateLimitedResponse, {
            status: 429,
          });
        }),
      );

      const params = createOAuthTestParams();

      const result = await fetchEmailFromCode(
        params.code,
        params.clientId,
        params.clientSecret,
        params.oauthDestination,
      );

      expect(result.id).toBeUndefined();
      expect(result.email).toBeUndefined();
      expect(result.verified).toBeUndefined();
    });
  });
});
