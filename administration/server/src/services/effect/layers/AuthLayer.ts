import { Layer } from 'effect';
import { AuthServiceLive, AuthServiceConfigLayer, BetterAuthLive, BetterAuthConfigLayer } from '../AuthService';
import { AuthorizationService } from '../AuthorizationEffects';
import { FlagServiceLive } from '../FlagServiceLive';

// Complete auth layer with all dependencies
export const AuthLayer = Layer.mergeAll(
  // Config layers first (no dependencies)
  BetterAuthConfigLayer,
  AuthServiceConfigLayer,
  // Service layers with dependencies
  AuthorizationService.Live,
  FlagServiceLive,
  BetterAuthLive,  // Now properly depends on BetterAuthConfigLayer
  AuthServiceLive  // Depends on all the above
);
