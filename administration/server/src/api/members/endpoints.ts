import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi,
} from '@effect/platform';
import { Schema } from 'effect';
import { NotFoundError, ParseError, UniqueError } from '~/api/errors';
import { ListQuerySchema } from '~/api/schemas';
import {
  CreateMemberSchema,
  MemberSchema,
  UpdateMemberSchema,
} from './schemas';

// Members API group
export const membersGroup = HttpApiGroup.make('members')
  .add(
    HttpApiEndpoint.get('api.members.list', '/api/members')
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
    HttpApiEndpoint.get('api.members.read', '/api/members/:id')
      .setPath(Schema.Struct({ id: Schema.NumberFromString }))
      .addSuccess(MemberSchema)
      .addError(NotFoundError)
      .annotate(OpenApi.Description, 'Get a member by ID')
  )
  .add(
    HttpApiEndpoint.post('api.members.create', '/api/members')
      .setPayload(CreateMemberSchema)
      .addSuccess(Schema.Void, { status: 201 })
      .addError(UniqueError)
      .annotate(OpenApi.Description, 'Create a new member')
  )
  .add(
    HttpApiEndpoint.put('api.members.update', '/api/members/:id')
      .setPath(Schema.Struct({ id: Schema.NumberFromString }))
      .setPayload(UpdateMemberSchema)
      .addSuccess(MemberSchema)
      .addError(NotFoundError)
      .addError(ParseError)
      .addError(UniqueError)
      .annotate(OpenApi.Description, 'Update an existing member')
  )
  .add(
    HttpApiEndpoint.del('api.members.delete', '/api/members/:id')
      .setPath(Schema.Struct({ id: Schema.NumberFromString }))
      .addSuccess(Schema.Void)
      .addError(NotFoundError)
      .annotate(OpenApi.Description, 'Delete a member')
  )
  .add(
    HttpApiEndpoint.post('api.members.note', '/api/members/:id/note')
      .setPath(Schema.Struct({ id: Schema.NumberFromString }))
      .setPayload(Schema.Struct({ content: Schema.String }))
      .addSuccess(Schema.Void, { status: 201 })
      .addError(NotFoundError)
      .addError(ParseError)
      .annotate(OpenApi.Description, 'Add a note to a member profile')
  );

// Members API
export const membersApi = HttpApi.make('MembersAPI').add(membersGroup);
