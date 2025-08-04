import { Data } from 'effect';

export class PatreonConfigError extends Data.TaggedError('PatreonConfigError')<{
  readonly message: string;
  readonly field?: string;
}> {}

export class PatreonAPIError extends Data.TaggedError('PatreonAPIError')<{
  readonly message: string;
  readonly statusCode?: number;
  readonly operation: string;
}> {}

export class PatreonWebhookError extends Data.TaggedError('PatreonWebhookError')<{
  readonly message: string;
  readonly payload?: string;
}> {}

export class PatreonSyncError extends Data.TaggedError('PatreonSyncError')<{
  readonly message: string;
  readonly patronId: string;
  readonly operation: string;
}> {}

export class PatreonOAuthError extends Data.TaggedError('PatreonOAuthError')<{
  readonly message: string;
  readonly code?: string;
}> {}
