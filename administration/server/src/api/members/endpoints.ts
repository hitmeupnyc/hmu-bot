import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi,
} from '@effect/platform';
import { Schema } from 'effect';
import {
  NotFoundError,
  ParseError,
  UniqueError,
} from '~/services/effect/errors/CommonErrors';
import { ListQuerySchema } from '~/services/effect/http';
import {
  CreateMemberSchema,
  MemberSchema,
  UpdateMemberSchema,
} from '~/services/effect/schemas/MemberSchemas';

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
      .setUrlParams(ListQuerySchema)
      .annotate(
        OpenApi.Description,
        'List all members with pagination and search'
      )
  )
  .add(
    HttpApiEndpoint.get('getMember', '/api/members/:id')
      .setPath(Schema.Struct({ id: Schema.NumberFromString }))
      .addSuccess(MemberSchema)
      .addError(NotFoundError)
      .annotate(OpenApi.Description, 'Get a member by ID')
  )
  .add(
    HttpApiEndpoint.post('createMember', '/api/members')
      .setPayload(CreateMemberSchema)
      .addSuccess(MemberSchema, { status: 201 })
      .addError(UniqueError)
      .annotate(OpenApi.Description, 'Create a new member')
  )
  .add(
    HttpApiEndpoint.put('updateMember', '/api/members/:id')
      .setPath(Schema.Struct({ id: Schema.NumberFromString }))
      .setPayload(UpdateMemberSchema)
      .addSuccess(MemberSchema)
      .addError(NotFoundError)
      .addError(ParseError)
      .addError(UniqueError)
      .annotate(OpenApi.Description, 'Update an existing member')
  )
  .add(
    HttpApiEndpoint.del('deleteMember', '/api/members/:id')
      .setPath(Schema.Struct({ id: Schema.NumberFromString }))
      .addSuccess(Schema.Struct({ message: Schema.String }))
      .addError(NotFoundError)
      .annotate(OpenApi.Description, 'Delete a member')
  );

// Members API
export const membersApi = HttpApi.make('MembersAPI').add(membersGroup);
