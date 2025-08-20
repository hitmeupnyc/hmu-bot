import { Layer } from 'effect';
import { AuthServiceLive, AuthServiceConfigLayer, BetterAuthLive } from '../AuthService';
import { AuthorizationService } from '../AuthorizationEffects';
import { FlagServiceLive } from '../FlagServiceLive';

// Complete auth layer with all dependencies
export const AuthLayer = Layer.mergeAll(
  AuthorizationService.Live,
  FlagServiceLive,
  BetterAuthLive,
  AuthServiceConfigLayer,
  AuthServiceLive
);
