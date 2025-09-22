import { HttpApiBuilder } from '@effect/platform';
import { Layer } from 'effect';

import { AuthMiddlewareLive } from '~/api/auth';
import { AuthLive } from '~/layers/auth';
import { DatabaseLive } from '~/layers/db';

import { Api } from '.';
import { AuditApiLive } from './audit';
import { EventsApiLive } from './events';
import { FlagsApiLive } from './flags';
import { HealthApiLive } from './health';
import { MembersApiLive } from './members';

// Create a comprehensive application layer that includes all services
// DatabaseLive provides DatabaseService directly
// Other services are built on top of DatabaseLive
export const ApplicationLive = Layer.mergeAll(DatabaseLive, AuthLive);

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
