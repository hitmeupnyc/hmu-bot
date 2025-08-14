import { Layer } from 'effect';
import { AuthServiceLive, AuthServiceConfigLayer } from '../AuthService';
import { AuthorizationService } from '../AuthorizationEffects';
import { FlagServiceLive } from '../FlagServiceLive';
import { BetterAuthLive } from '../../../auth';

// Complete auth layer with all dependencies
export const AuthLayer = Layer.mergeAll(
  AuthorizationService.Live,
  FlagServiceLive,
  BetterAuthLive,
  AuthServiceConfigLayer,
  AuthServiceLive
);
