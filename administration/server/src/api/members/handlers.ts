import { HttpApiBuilder } from '@effect/platform';
import { Effect, Layer } from 'effect';
import { ParseError as InternalParseError } from 'effect/ParseResult';
import {
  MemberService,
  MemberServiceLive,
} from '~/services/effect/MemberEffects';
import {
  DatabaseError,
  NotFoundError,
  ParseError,
  UniqueError,
} from '~/services/effect/errors/CommonErrors';
import { DatabaseService, DatabaseLive } from '~/services/effect/layers/DatabaseLayer';
import { CurrentUser } from '~/middleware/auth';
import { membersApi } from './endpoints';

export const MembersApiLive = HttpApiBuilder.group(
  membersApi,
  'members',
  (handlers) =>
    Effect.gen(function* () {
      const memberService = yield* MemberService;

      return handlers
        .handle('api.members.list', ({ urlParams }) =>
          Effect.gen(function* () {
            const page = urlParams.page ?? 1;
            const limit = urlParams.limit ?? 20;
            const search = urlParams.search;

            const result = yield* memberService
              .getMembers({ page, limit, search })
              .pipe(
                Effect.mapError((error) => {
                  throw error;
                })
              );

            return {
              data: result.members,
              total: result.pagination.total,
              page: result.pagination.page,
              limit: result.pagination.limit,
              totalPages: result.pagination.totalPages,
            };
          })
        )

        .handle('api.members.read', ({ path }) =>
          Effect.gen(function* () {
            const member = yield* memberService.getMemberById(path.id).pipe(
              Effect.mapError((error) => {
                if (error instanceof NotFoundError) {
                  return new NotFoundError({
                    id: path.id.toString(),
                    resource: 'member',
                  });
                }
                if (error instanceof DatabaseError) {
                  throw new Error('Database error occurred');
                }
                throw error;
              })
            );
            return member;
          })
        )

        .handle('api.members.create', ({ payload }) =>
          Effect.gen(function* () {
            const member = yield* memberService.createMember(payload).pipe(
              Effect.mapError((error) => {
                if (error instanceof UniqueError) {
                  return new UniqueError({
                    field: 'email',
                    value: payload.email,
                  });
                }
                if (error instanceof DatabaseError) {
                  throw new Error('Database error occurred');
                }
                throw error;
              })
            );
            return member;
          })
        )

        .handle('api.members.update', ({ path, payload }) =>
          Effect.gen(function* () {
            const member = yield* memberService.updateMember({
              ...payload,
              id: path.id,
            });
            return member;
          }).pipe(
            Effect.mapError((error) => {
              if (error instanceof InternalParseError) {
                return new ParseError(error);
              }
              throw error;
            })
          )
        )

        .handle('api.members.delete', ({ path }) =>
          Effect.gen(function* () {
            yield* memberService.deleteMember(path.id).pipe(
              Effect.mapError((error) => {
                if (error instanceof NotFoundError) {
                  return new NotFoundError({
                    id: path.id.toString(),
                    resource: 'member',
                  });
                }
                if (error instanceof DatabaseError) {
                  throw new Error('Database error occurred');
                }
                throw error;
              })
            );
            return { message: 'Member deleted successfully' };
          })
        )

        .handle('api.members.note', ({ path, payload }) =>
          Effect.gen(function* () {
            const db = yield* DatabaseService;
            const currentUser = yield* CurrentUser;

            // First verify the member exists
            const member = yield* memberService.getMemberById(path.id).pipe(
              Effect.mapError((error) => {
                if (error instanceof NotFoundError) {
                  return new NotFoundError({
                    id: path.id.toString(),
                    resource: 'member',
                  });
                }
                throw error;
              })
            );

            // Create audit log entry
            yield* db.query(async (database) => {
              return database
                .insertInto('audit_log')
                .values({
                  entity_type: 'member',
                  entity_id: path.id,
                  action: 'note',
                  user_email: currentUser.email || null,
                  user_id: currentUser.id || null,
                  user_session_id: null, // We don't have session ID from CurrentUser context
                  metadata_json: JSON.stringify({ content: payload.content }),
                })
                .execute();
            }).pipe(
              Effect.mapError((error) => {
                throw new DatabaseError({ message: 'Failed to create note' });
              })
            );

            return { message: 'Note added successfully' };
          })
        );
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          MemberServiceLive,
          DatabaseLive
        )
      )
    )
);
