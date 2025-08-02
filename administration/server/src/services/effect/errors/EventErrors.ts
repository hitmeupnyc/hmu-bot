import { Data } from 'effect';

export class EventNotFound extends Data.TaggedError('EventNotFound')<{
  readonly eventId: number;
}> {}

export class EventValidationError extends Data.TaggedError('EventValidationError')<{
  readonly field: string;
  readonly message: string;
}> {}

export class AttendanceAlreadyExists extends Data.TaggedError('AttendanceAlreadyExists')<{
  readonly eventId: number;
  readonly identifier: string;
}> {}

export class AttendanceNotFound extends Data.TaggedError('AttendanceNotFound')<{
  readonly attendanceId: number;
}> {}

export class EventMarketingError extends Data.TaggedError('EventMarketingError')<{
  readonly eventId: number;
  readonly message: string;
}> {}

export class VolunteerError extends Data.TaggedError('VolunteerError')<{
  readonly eventId: number;
  readonly memberId: number;
  readonly message: string;
}> {}
