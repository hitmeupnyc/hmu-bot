import { HttpApiBuilder } from '@effect/platform';
import { Effect, Schema } from 'effect';
import { sql } from 'kysely';
import { CurrentUser } from '~/api/auth';
import { NotFoundError, UniqueError } from '~/api/errors';
import { MemberFlagSchema, MemberSchema } from '~/api/members/schemas';
import { DatabaseLive, DatabaseService } from '~/layers/db';
import { membersApi } from './endpoints';

export const MembersApiLive = HttpApiBuilder.group(
  membersApi,
  'members',
  (handlers) =>
    Effect.gen(function* () {
      const dbService = yield* DatabaseService;

      return handlers
        .handle('list', ({ urlParams }) =>
          Effect.gen(function* () {
            const { page, limit, search } = urlParams;
            const offset = (page - 1) * limit;

            const [countResult, memberRows] = yield* dbService
              .query(async (db) => {
                // Only active members
                let query = db.selectFrom('members').where('flags', '=', 1);

                if (search) {
                  const searchTerm = `%${search}%`;
                  query = query.where((eb) =>
                    eb.or([
                      eb('first_name', 'like', searchTerm),
                      eb('last_name', 'like', searchTerm),
                      eb('email', 'like', searchTerm),
                    ])
                  );
                }

                const countQuery = query
                  .clearSelect()
                  .select((eb) => eb.fn.count('id').as('total'));

                const selectQuery = query
                  .select([
                    'id',
                    'first_name',
                    'last_name',
                    'preferred_name',
                    'email',
                    'pronouns',
                    'sponsor_notes',
                    sql`CAST(flags AS INTEGER)`.as('flags'),
                    'date_added',
                    'created_at',
                    'updated_at',
                  ])
                  .orderBy('created_at', 'desc')
                  .limit(limit)
                  .offset(offset);

                return Promise.all([
                  countQuery.executeTakeFirst() as Promise<{ total: string }>,
                  selectQuery.execute(),
                ]);
              })
              .pipe(Effect.withSpan('db.members.list'));

            const members = yield* Effect.forEach(memberRows, (row) =>
              Schema.decodeUnknown(MemberSchema)(row).pipe(Effect.orDie)
            );

            const total = parseInt(countResult?.total || '0');
            const totalPages = Math.ceil(total / limit);

            return {
              data: members,
              page,
              limit,
              total,
              totalPages,
            };
          })
        )

        .handle('read', ({ path }) =>
          Effect.gen(function* () {
            const member = yield* dbService.query(async (db) =>
              db
                .selectFrom('members')
                .select([
                  'id',
                  'first_name',
                  'last_name',
                  'preferred_name',
                  'email',
                  'pronouns',
                  'sponsor_notes',
                  'flags',
                  'date_added',
                  'created_at',
                  'updated_at',
                ])
                .where('id', '=', path.id)
                .where('flags', '=', 1)
                .executeTakeFirst()
            );

            if (!member) {
              return yield* new NotFoundError({
                id: path.id.toString(),
                resource: 'member',
              });
            }

            return yield* Schema.decodeUnknown(MemberSchema)(member).pipe(
              Effect.orDie
            );
          })
        )

        .handle('create', ({ payload }) =>
          Effect.gen(function* () {
            // Check if email already exists
            const existingMember = yield* dbService.query(async (db) =>
              db
                .selectFrom('members')
                .select('id')
                .where('email', '=', payload.email)
                .executeTakeFirst()
            );

            if (existingMember) {
              return yield* new UniqueError({
                field: 'email',
                value: payload.email,
              });
            }

            yield* dbService.query(async (db) =>
              db
                .insertInto('members')
                .values({
                  first_name: payload.first_name,
                  last_name: payload.last_name,
                  preferred_name: payload.preferred_name || null,
                  email: payload.email,
                  pronouns: payload.pronouns || null,
                  sponsor_notes: payload.sponsor_notes || null,
                })
                .executeTakeFirstOrThrow()
            );
          })
        )

        .handle('update', ({ payload }) =>
          Effect.gen(function* () {
            const { id, email } = payload;
            // email conflict
            if (email) {
              const conflict = yield* dbService.query(async (db) =>
                db
                  .selectFrom('members')
                  .select('id')
                  .where('email', '=', email)
                  .where('id', '!=', id)
                  .executeTakeFirst()
              );
              if (conflict) {
                throw new UniqueError({ field: 'email', value: email });
              }
            }

            // deactivated account
            const member = yield* dbService.query(async (db) =>
              db
                .selectFrom('members')
                .select(['id', 'flags'])
                .where('id', '=', id)
                .executeTakeFirst()
            );
            if (member && ((member.flags || 0) & 1) === 0) {
              throw new NotFoundError({ id: `${id}`, resource: 'member' });
            }

            //

            const updateData = Object.fromEntries(
              Object.entries(payload).filter(
                ([_, value]) => value !== undefined
              )
            );

            updateData.updated_at = new Date().toISOString();

            const result = yield* dbService.query(async (db) =>
              db
                .updateTable('members')
                .set(updateData)
                .where('id', '=', payload.id)
                .returningAll()
                .executeTakeFirstOrThrow()
            );

            return yield* Schema.decodeUnknown(MemberSchema)(result).pipe(
              Effect.orDie
            );
          })
        )

        .handle('delete', ({ path }) =>
          Effect.gen(function* () {
            const { id } = path;
            const member = yield* dbService.query(async (db) =>
              db
                .selectFrom('members')
                .select(['id', 'flags'])
                .where('id', '=', id)
                .executeTakeFirst()
            );

            if (!member) {
              throw new NotFoundError({ id: `${id}`, resource: 'members' });
            }

            // Soft delete by setting active flag to false
            const flags = (member?.flags || 0) & ~1; // Clear active bit

            yield* dbService.query(async (db) =>
              db
                .updateTable('members')
                .set({ flags, updated_at: new Date().toISOString() })
                .where('id', '=', path.id)
                .execute()
            );
          })
        )

        .handle('note', ({ path, payload }) =>
          Effect.gen(function* () {
            const currentUser = yield* CurrentUser;

            // First verify the member exists
            yield* dbService.query(async (db) =>
              db
                .selectFrom('members')
                .select('id')
                .where('id', '=', path.id)
                .where('flags', '=', 1)
                .executeTakeFirst()
            );

            // Create audit log entry
            yield* dbService
              .query(async (db) =>
                db
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
                  .execute()
              )
              .pipe(
                Effect.mapError((error) => {
                  throw error;
                })
              );
          })
        )

        .handle('listFlags', ({ path }) =>
          Effect.gen(function* () {
            const member = yield* dbService.query((db) =>
              db
                .selectFrom('members')
                .select(['id'])
                .where('id', '=', parseInt(path.id, 10))
                .executeTakeFirst()
            );

            if (!member) {
              return [];
            }

            const flags = yield* dbService.query((db) =>
              db
                .selectFrom('members_flags as mf')
                .innerJoin('flags as f', 'f.id', 'mf.flag_id')
                .select([
                  'f.id',
                  'mf.member_id',
                  'f.name',
                  'mf.granted_at',
                  'mf.expires_at',
                  'mf.granted_by',
                  'mf.metadata',
                ])
                .where('mf.member_id', '=', path.id)
                .execute()
            );

            return yield* Schema.decodeUnknown(Schema.Array(MemberFlagSchema))(
              flags
            ).pipe(Effect.orDie);
          })
        )

        .handle('grantFlag', ({ path, payload }) =>
          Effect.gen(function* () {
            const currentUser = yield* CurrentUser;

            yield* dbService.query((db) =>
              db.transaction().execute(async (trx) => {
                const existing = await trx
                  .selectFrom('members_flags')
                  .select('member_id')
                  .where('member_id', '=', path.id)
                  .where('flag_id', '=', payload.flag_id)
                  .executeTakeFirst();

                if (existing) {
                  await trx
                    .updateTable('members_flags')
                    .set({
                      member_id: path.id,
                      ...payload,
                      granted_by: currentUser.id,
                    })
                    .where('member_id', '=', path.id)
                    .where('flag_id', '=', payload.flag_id)
                    .execute();
                } else {
                  await trx
                    .insertInto('members_flags')
                    .values({ member_id: path.id, ...payload })
                    .execute();
                }
                // TODO: Audit logging
              })
            );
          })
        )

        .handle('revokeFlag', ({ path }) =>
          Effect.gen(function* () {
            // TODO: audit logs
            yield* dbService.query((db) =>
              db.transaction().execute(async (trx) => {
                await trx
                  .deleteFrom('members_flags')
                  .where('member_id', '=', path.id)
                  .where('flag_id', '=', path.flagId)
                  .execute();
              })
            );
          })
        )

        .handle('flagMembers', ({ path }) =>
          Effect.gen(function* () {
            const members = yield* dbService.query((db) =>
              db
                .selectFrom('members_flags as mf')
                .innerJoin('members as m', 'm.id', 'mf.member_id')
                .select([
                  'm.id',
                  'm.first_name',
                  'm.last_name',
                  'm.preferred_name',
                  'm.email',
                  'm.pronouns',
                  'm.sponsor_notes',
                  'm.flags',
                  'm.date_added',
                  'm.created_at',
                  'm.updated_at',
                ])
                .where('mf.flag_id', '=', path.flagId)
                .execute()
            );

            return yield* Schema.decodeUnknown(Schema.Array(MemberSchema))(
              members
            ).pipe(Effect.orDie);
          })
        );
    }).pipe(Effect.provide(DatabaseLive))
);
