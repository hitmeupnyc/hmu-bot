/**
 * Member API handlers using @effect/platform HttpApi
 * Implements the business logic for all member endpoints
 */

import { HttpApiBuilder } from '@effect/platform';
import { Effect } from 'effect';
import { ParseError as InternalParseError } from 'effect/ParseResult';
import {
  MemberService,
  MemberServiceLive,
} from '~/services/effect/MemberEffects';
import { withHttpRequestObservability } from '~/services/effect/adapters/observabilityUtils';
import {
  DatabaseError,
  NotFoundError,
  ParseError,
  UniqueError,
} from '~/services/effect/errors/CommonErrors';
import { membersApi } from './endpoints';

export const MembersApiLive = HttpApiBuilder.group(
  membersApi,
  'members',
  (handlers) =>
    Effect.gen(function* () {
      const memberService = yield* MemberService;

      return handlers
        .handle('listMembers', ({ urlParams, request }) =>
          Effect.gen(function* () {
            const page = urlParams.page ?? 1;
            const limit = urlParams.limit ?? 20;
            const search = urlParams.search;

            const result = yield* memberService
              .getMembers({ page, limit, search })
              .pipe(
                Effect.mapError((error) => {
                  // Map service errors to API errors
                  if (error instanceof DatabaseError) {
                    throw new Error('Database error occurred');
                  }
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
          }).pipe(
            withHttpRequestObservability('api.members.listMembers', request)
          )
        )

        .handle('getMember', ({ path, request }) =>
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
          }).pipe(
            withHttpRequestObservability('api.members.getMember', request)
          )
        )

        .handle('createMember', ({ payload, request }) =>
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
          }).pipe(
            withHttpRequestObservability('api.members.createMember', request)
          )
        )

        .handle('updateMember', ({ path, payload, request }) =>
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
            }),
            withHttpRequestObservability('api.members.updateMember', request)
          )
        )

        .handle('deleteMember', ({ path, request }) =>
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
          }).pipe(
            withHttpRequestObservability('api.members.deleteMember', request)
          )
        );
    }).pipe(Effect.provide(MemberServiceLive))
);
