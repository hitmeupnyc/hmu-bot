/**
 * Member API endpoints using @effect/platform HttpApi
 * Defines the complete Members API with proper schemas and middleware
 */

import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from '@effect/platform';
import { Schema } from 'effect';
import {
  CreateMemberSchema,
  MemberSchema,
  UpdateMemberSchema,
} from '~/services/effect/schemas/MemberSchemas';

// Common error schemas
export class MemberNotFound extends Schema.TaggedError<MemberNotFound>()(
  'MemberNotFound',
  { memberId: Schema.Number },
  HttpApiSchema.annotations({ status: 404 })
) {}

export class MemberEmailExists extends Schema.TaggedError<MemberEmailExists>()(
  'MemberEmailExists',
  { email: Schema.String },
  HttpApiSchema.annotations({ status: 409 })
) {}


// Query parameter schemas for listing members
const MemberListQuery = Schema.Struct({
  page: Schema.optional(Schema.NumberFromString.pipe(Schema.positive())),
  limit: Schema.optional(
    Schema.NumberFromString.pipe(
      Schema.positive(),
      Schema.lessThanOrEqualTo(100)
    )
  ),
  search: Schema.optional(Schema.String),
});

// Members API group
export const membersGroup = HttpApiGroup.make('members')
  .add(
    HttpApiEndpoint.get('listMembers', '/api/members')
      .addSuccess(
        Schema.Struct({
          data: Schema.Array(MemberSchema),
          total: Schema.Number,
          page: Schema.Number,
          limit: Schema.Number,
          totalPages: Schema.Number,
        })
      )
      .setUrlParams(MemberListQuery)
      // .middleware(Authentication) // Applied globally via HttpApiBuilder
      .annotate(
        OpenApi.Description,
        'List all members with pagination and search'
      )
  )
  .add(
    HttpApiEndpoint.get('getMember', '/api/members/:id')
      .setPath(Schema.Struct({ id: Schema.NumberFromString }))
      .addSuccess(MemberSchema)
      .addError(MemberNotFound)
      // .middleware(Authentication) // Applied globally via HttpApiBuilder
      .annotate(OpenApi.Description, 'Get a member by ID')
  )
  .add(
    HttpApiEndpoint.post('createMember', '/api/members')
      .setPayload(CreateMemberSchema)
      .addSuccess(MemberSchema, { status: 201 })
      .addError(MemberEmailExists)
      // .middleware(Authentication) // Applied globally via HttpApiBuilder
      .annotate(OpenApi.Description, 'Create a new member')
  )
  .add(
    HttpApiEndpoint.put('updateMember', '/api/members/:id')
      .setPath(Schema.Struct({ id: Schema.NumberFromString }))
      .setPayload(UpdateMemberSchema)
      .addSuccess(MemberSchema)
      .addError(MemberNotFound)
      .addError(MemberEmailExists)
      // .middleware(Authentication) // Applied globally via HttpApiBuilder
      .annotate(OpenApi.Description, 'Update an existing member')
  )
  .add(
    HttpApiEndpoint.del('deleteMember', '/api/members/:id')
      .setPath(Schema.Struct({ id: Schema.NumberFromString }))
      .addSuccess(Schema.Struct({ message: Schema.String }))
      .addError(MemberNotFound)
      // .middleware(Authentication) // Applied globally via HttpApiBuilder
      .annotate(OpenApi.Description, 'Delete a member')
  );

// Members API
export const membersApi = HttpApi.make('MembersAPI').add(membersGroup);
