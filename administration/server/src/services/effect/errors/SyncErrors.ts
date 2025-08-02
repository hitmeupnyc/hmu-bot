import { Data } from 'effect';

export class SyncOperationError extends Data.TaggedError('SyncOperationError')<{
  readonly message: string;
  readonly platform: string;
  readonly operation: string;
}> {}

export class ExternalIntegrationError extends Data.TaggedError('ExternalIntegrationError')<{
  readonly message: string;
  readonly systemName: string;
  readonly externalId: string;
}> {}

export class HMACVerificationError extends Data.TaggedError('HMACVerificationError')<{
  readonly message: string;
  readonly algorithm?: string;
}> {}

export class MemberNotFoundError extends Data.TaggedError('MemberNotFoundError')<{
  readonly identifier: string;
  readonly identifierType: 'id' | 'email' | 'external_id';
}> {}

export class DuplicateEmailError extends Data.TaggedError('DuplicateEmailError')<{
  readonly email: string;
}> {}

export class InvalidEmailError extends Data.TaggedError('InvalidEmailError')<{
  readonly email: string;
}> {}
