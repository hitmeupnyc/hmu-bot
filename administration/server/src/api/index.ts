/**
 * Main API definition
 * Combines all API groups with proper authentication separation
 */

import { HttpApi, HttpApiBuilder, OpenApi } from '@effect/platform';
import { Layer } from 'effect';
import { Authentication, AuthenticationLive } from '~/middleware/auth';
import { ApplicationLive } from '~/services/effect/adapters/expressAdapter';
import { EventsApiLive, eventsGroup } from './events';
import { HealthApiLive, healthGroup } from './health';
import { MembersApiLive, membersGroup } from './members';

// Create the complete API by combining all groups
export const api = HttpApi.make('ClubManagementAPI')
  .add(healthGroup)
  .middleware(Authentication)
  .add(membersGroup)
  .add(eventsGroup)
  .annotate(OpenApi.Description, 'Club Management System API')
  .annotate(OpenApi.Summary, 'RESTful API for club management');

// Create the complete API implementation
export const ApiLive = HttpApiBuilder.api(api).pipe(
  Layer.provide(
    Layer.mergeAll(HealthApiLive, MembersApiLive, EventsApiLive, AuthenticationLive)
  ),
  Layer.provide(ApplicationLive)
);
