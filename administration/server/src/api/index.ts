/**
 * Main API definition
 * Combines all API groups with proper authentication separation
 */

import { HttpApi, HttpApiBuilder, OpenApi } from '@effect/platform';
import { Layer } from 'effect';
import { Authentication, AuthenticationLive } from '~/middleware/auth';
import { ApplicationLive } from '~/services/effect/adapters/expressAdapter';
import { HealthApiLive, healthGroup } from './health';
import { MembersApiLive, membersGroup } from './members';

// Create the complete API by combining all groups
export const api = HttpApi.make('ClubManagementAPI')
  .add(healthGroup) // Public - no auth required
  .middleware(Authentication)
  .add(membersGroup) // Protected - auth required
  .annotate(OpenApi.Description, 'Club Management System API')
  .annotate(OpenApi.Summary, 'RESTful API for club management');

// Create the complete API implementation
export const ApiLive = HttpApiBuilder.api(api).pipe(
  Layer.provide(
    Layer.mergeAll(HealthApiLive, MembersApiLive, AuthenticationLive)
  ),
  Layer.provide(ApplicationLive)
);
