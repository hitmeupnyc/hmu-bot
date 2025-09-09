import { HttpApiEndpoint, HttpApiGroup, OpenApi } from '@effect/platform';
import { Schema } from 'effect';
import { ParseError } from '~/api/errors';
import { BulkFlagRequestSchema, FlagSchema } from './schemas';

// Flags API group
export const flagsGroup = HttpApiGroup.make('flags')
  .add(
    HttpApiEndpoint.get('api.flags.list', '/api/flags')
      .addSuccess(Schema.Array(FlagSchema))
      .annotate(OpenApi.Description, 'List all available flags in the system')
  )
  .add(
    HttpApiEndpoint.post('api.flags.bulk', '/api/flags/bulk')
      .setPayload(BulkFlagRequestSchema)
      .addSuccess(
        Schema.Array(
          Schema.Struct({
            member_id: Schema.String,
            flag_id: Schema.String,
            success: Schema.Boolean,
          })
        )
      )
      .addError(ParseError)
      .annotate(
        OpenApi.Description,
        'Process multiple flag grant operations in a single request'
      )
  );
