/**
 * Main API definition
 * Combines all API groups into a single HttpApi
 */

import { HttpApi, HttpApiBuilder, OpenApi } from '@effect/platform';
import { Layer } from 'effect';
// import { healthGroup } from './health';
import { AuthLive } from '~/services/effect/layers/AuthLayer';
import { MembersApiLive, membersGroup } from './members';

// Create the complete API by combining all groups (auth now handled by BetterAuth directly)
export const api = HttpApi.make('ClubManagementAPI')
  // .add(healthGroup)
  .add(membersGroup)
  .annotate(OpenApi.Description, 'Club Management System API')
  .annotate(OpenApi.Summary, 'RESTful API for club management');

// Create the complete API implementation
export const ApiLive = HttpApiBuilder.api(api).pipe(
  Layer.provide(
    Layer.mergeAll(
      // HealthApiLive,
      MembersApiLive,
      AuthLive
    )
  )
);
