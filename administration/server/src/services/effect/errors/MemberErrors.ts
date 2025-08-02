import { Data } from 'effect';

export class MemberNotFound extends Data.TaggedError('MemberNotFound')<{
  readonly memberId: number;
}> {}

export class EmailAlreadyExists extends Data.TaggedError('EmailAlreadyExists')<{
  readonly email: string;
}> {}

export class InvalidEmail extends Data.TaggedError('InvalidEmail')<{
  readonly email: string;
}> {}

export class MemberValidationError extends Data.TaggedError('MemberValidationError')<{
  readonly field: string;
  readonly message: string;
}> {}

export class MemberUpdateError extends Data.TaggedError('MemberUpdateError')<{
  readonly memberId: number;
  readonly message: string;
}> {}
