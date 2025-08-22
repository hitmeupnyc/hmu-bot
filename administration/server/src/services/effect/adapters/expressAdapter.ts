import { Effect, Layer } from 'effect';
import type { NextFunction, Request, Response } from 'express';

import { AuditServiceLive } from '../AuditEffects';
import { AuthorizationService } from '../AuthorizationEffects';
import { EventServiceLive } from '../EventEffects';
import { Express } from '../http/context';
import { AuthLive } from '../layers/AuthLayer';
import { DatabaseLive } from '../layers/DatabaseLayer';
import { FlagLive } from '../layers/FlagLayer';
import { MemberServiceLive } from '../MemberEffects';

// Create a comprehensive application layer that includes all services
// DatabaseLive provides DatabaseService directly
// Other services are built on top of DatabaseLive
const ApplicationLive = Layer.mergeAll(
  DatabaseLive,
  MemberServiceLive,
  EventServiceLive,
  AuditServiceLive,
  FlagLive,
  AuthLive,
  AuthorizationService.Live
);

export function withExpress(req: Request, res: Response, next: NextFunction) {
  return Effect.provideService(Express, { req, res, next });
}
