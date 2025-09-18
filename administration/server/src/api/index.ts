// organize-imports-ignore Because of funky type errors from @effect/platform

import { HttpApi, OpenApi } from '@effect/platform';

// These aren't directly used but apparently must be in scope for
// `const Api = HttpApi.make(…` to work without type errors.
import type { Effect, Sink, Stream, Channel } from 'effect';
import type { NodeInspectSymbol } from 'effect/Inspectable';

import { AuthMiddleware } from '~/api/auth';

import { auditGroup } from './audit';
import { eventsGroup } from './events';
import { flagsGroup } from './flags';
import { healthGroup } from './health';
import { membersGroup } from './members';

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
