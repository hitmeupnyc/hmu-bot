import {
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi,
} from '@effect/platform';
import { Schema } from 'effect';
import {
  NotFoundError,
  ParseError,
} from '~/services/effect/errors/CommonErrors';
import {
  BulkFlagRequestSchema,
  BulkFlagResponseSchema,
  FlagOperationResponseSchema,
  FlagSchema,
  GrantFlagSchema,
  MemberFlagSchema,
  MemberWithFlagSchema,
  ProcessingResultSchema,
  RevokeFlagSchema,
} from '~/services/effect/schemas/FlagSchemas';

// Flags API group
export const flagsGroup = HttpApiGroup.make('flags')
  .add(
    HttpApiEndpoint.get('api.flags.list', '/api/flags')
      .addSuccess(Schema.Array(FlagSchema))
      .annotate(
        OpenApi.Description,
        'List all available flags in the system'
      )
  )
  .add(
    HttpApiEndpoint.get('api.flags.members.list', '/api/members/:id/flags')
      .setPath(Schema.Struct({ id: Schema.String }))
      .addSuccess(Schema.Array(MemberFlagSchema))
      .addError(NotFoundError)
      .annotate(
        OpenApi.Description,
        'Get all flags assigned to a specific member'
      )
  )
  .add(
    HttpApiEndpoint.post('api.flags.members.grant', '/api/members/:id/flags')
      .setPath(Schema.Struct({ id: Schema.String }))
      .setPayload(GrantFlagSchema)
      .addSuccess(FlagOperationResponseSchema)
      .addError(NotFoundError)
      .addError(ParseError)
      .annotate(
        OpenApi.Description,
        'Grant a flag to a member with optional expiration and metadata'
      )
  )
  .add(
    HttpApiEndpoint.del('api.flags.members.revoke', '/api/members/:id/flags/:flagId')
      .setPath(Schema.Struct({ 
        id: Schema.String, 
        flagId: Schema.String 
      }))
      .setPayload(RevokeFlagSchema)
      .addSuccess(FlagOperationResponseSchema)
      .addError(NotFoundError)
      .annotate(
        OpenApi.Description,
        'Revoke a specific flag from a member with optional reason'
      )
  )
  .add(
    HttpApiEndpoint.get('api.flags.flag.members', '/api/flags/:flagId/members')
      .setPath(Schema.Struct({ flagId: Schema.String }))
      .addSuccess(Schema.Array(MemberWithFlagSchema))
      .addError(NotFoundError)
      .annotate(
        OpenApi.Description,
        'List all members who have been assigned a specific flag'
      )
  )
  .add(
    HttpApiEndpoint.post('api.flags.bulk', '/api/flags/bulk')
      .setPayload(BulkFlagRequestSchema)
      .addSuccess(BulkFlagResponseSchema)
      .addError(ParseError)
      .annotate(
        OpenApi.Description,
        'Process multiple flag grant operations in a single request'
      )
  )
  .add(
    HttpApiEndpoint.post('api.flags.expire', '/api/flags/expire')
      .addSuccess(ProcessingResultSchema)
      .annotate(
        OpenApi.Description,
        'Process and revoke all expired flags, returning processing statistics'
      )
  );