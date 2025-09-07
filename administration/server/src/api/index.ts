// organize-imports-ignore Because of funky type errors from @effect/platform

import { HttpApi, HttpApiBuilder, OpenApi } from '@effect/platform';
import { Layer } from 'effect';

// These aren't directly used but apparently must be in scope for
// `const Api = HttpApi.make(…` to work without type errors.
import type { Effect, Sink, Stream, Channel } from 'effect';
import type { NodeInspectSymbol } from 'effect/Inspectable';

import { AuthMiddleware, AuthMiddlewareLive } from '~/middleware/auth';
import { AuthLive } from '~/services/auth/AuthLayer';
import { DatabaseLive } from '~/services/effect/layers/DatabaseLayer';

import { AuditApiLive, auditGroup } from './audit';
import { EventsApiLive, eventsGroup } from './events';
import { FlagsApiLive, flagsGroup } from './flags';
import { HealthApiLive, healthGroup } from './health';
import { MembersApiLive, membersGroup } from './members';

// Create a comprehensive application layer that includes all services
// DatabaseLive provides DatabaseService directly
// Other services are built on top of DatabaseLive
export const ApplicationLive = Layer.mergeAll(DatabaseLive, AuthLive);

// Create the complete API by combining all groups
export const Api = HttpApi.make('ClubManagementAPI')
  .add(healthGroup)
  .middleware(AuthMiddleware)
  .add(membersGroup)
  .add(eventsGroup)
  .add(flagsGroup)
  .add(auditGroup)
  .annotate(OpenApi.Description, 'Club Management System API')
  .annotate(OpenApi.Summary, 'RESTful API for club management');

// Create the complete API implementation
export const ApiLive = HttpApiBuilder.api(Api).pipe(
  Layer.provide(
    Layer.mergeAll(
      HealthApiLive,
      MembersApiLive,
      EventsApiLive,
      FlagsApiLive,
      AuditApiLive,
      AuthMiddlewareLive
    )
  ),
  Layer.provide(ApplicationLive)
);
