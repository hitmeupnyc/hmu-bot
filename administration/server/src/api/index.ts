/**
 * Main API definition
 * Combines all API groups into a single HttpApi
 */

import { HttpApi, HttpApiBuilder, OpenApi } from "@effect/platform"
import { Layer } from "effect"
import { authGroup, createAuthApiLive } from "./auth"
import { healthGroup, HealthApiLive } from "./health"
import { membersGroup, createMembersApiLive } from "./members"

// Create the complete API by combining all groups
export const api = HttpApi.make("ClubManagementAPI")
  .add(authGroup)
  .add(healthGroup)
  .add(membersGroup)
  .annotate(OpenApi.Description, "Club Management System API")
  .annotate(OpenApi.Summary, "RESTful API for club management")

// Create the complete API implementation
export const ApiLive = HttpApiBuilder.api(api).pipe(
  Layer.provide(createAuthApiLive(api)),
  Layer.provide(HealthApiLive),
  Layer.provide(createMembersApiLive(api))
)