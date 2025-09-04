import { Context, Effect, Layer, Schema } from 'effect';
import { sql } from 'kysely';
import {
  NotFoundError,
  ParseError,
  UniqueError,
  UnrecoverableError,
} from '~/api/errors';
import {
  CreateMemberSchema,
  MemberFlagsSchema,
  MemberQueryOptionsSchema,
  MemberSchema,
  UpdateMemberSchema,
  type CreateMember,
  type MemberQueryOptions,
  type UpdateMember,
} from '~/api/members/schemas';
import {
  DatabaseLive,
  DatabaseService,
} from '~/services/effect/layers/DatabaseLayer';

// Service interface
export interface IMemberService {
  readonly getMembers: (options: MemberQueryOptions) => Effect.Effect<
    {
      members: (typeof MemberSchema.Type)[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    },
    ParseError | UnrecoverableError,
    never
  >;

  readonly getMemberById: (
    id: number
  ) => Effect.Effect<
    typeof MemberSchema.Type,
    ParseError | NotFoundError | UnrecoverableError,
    never
  >;

  readonly createMember: (
    data: CreateMember
  ) => Effect.Effect<
    typeof MemberSchema.Type,
    UniqueError | ParseError | NotFoundError | UnrecoverableError,
    never
  >;

  readonly updateMember: (
    data: UpdateMember
  ) => Effect.Effect<
    typeof MemberSchema.Type,
    UniqueError | ParseError | NotFoundError | UnrecoverableError,
    never
  >;

  readonly deleteMember: (
    id: number
  ) => Effect.Effect<
    void,
    NotFoundError | ParseError | UnrecoverableError,
    never
  >;
}

export const MemberService =
  Context.GenericTag<IMemberService>('MemberService');

// Service implementation layer
export const MemberServiceLive = Layer.effect(
  MemberService,
  Effect.gen(function* () {
    const dbService = yield* DatabaseService;

    const getMembers: IMemberService['getMembers'] = (options) =>
      Effect.gen(function* () {
        const validatedOptions = yield* Schema.decodeUnknown(
          MemberQueryOptionsSchema
        )(options);

        const { page, limit, search } = validatedOptions;
        const offset = (page - 1) * limit;

        const [countResult, memberRows] = yield* dbService.obQuery(
          'members.list.active',
          async (db) => {
            let query = db.selectFrom('members').where('flags', '=', '1'); // Only active members

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
          }
        );

        const members = yield* Effect.forEach(memberRows, (row) =>
          Schema.decodeUnknown(MemberSchema)(row)
        );

        const total = parseInt(countResult?.total || '0');
        const totalPages = Math.ceil(total / limit);

        return {
          members,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        };
      });

    const getMemberById: IMemberService['getMemberById'] = (id) =>
      Effect.gen(function* () {
        const member = yield* dbService.obQuery('members.get', async (db) =>
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
              (eb) => sql`CAST(flags AS INTEGER)`.as('flags'),
              'date_added',
              'created_at',
              'updated_at',
            ])
            .where('id', '=', id)
            .where('flags', '=', '1')
            .executeTakeFirst()
        );

        if (!member) {
          return yield* new NotFoundError({
            id: id.toString(),
            resource: 'member',
          });
        }

        return yield* Schema.decodeUnknown(MemberSchema)(member);
      });

    const createMember: IMemberService['createMember'] = (data) =>
      Effect.gen(function* () {
        const validatedData =
          yield* Schema.decodeUnknown(CreateMemberSchema)(data);

        // Check if email already exists
        const existingMember = yield* dbService.obQuery(
          'members.create.check',
          async (db) =>
            db
              .selectFrom('members')
              .select('id')
              .where('email', '=', validatedData.email)
              .executeTakeFirst()
        );

        if (existingMember) {
          return yield* new UniqueError({
            field: 'email',
            value: validatedData.email,
          });
        }

        const flags = yield* Effect.gen(function* () {
          const validatedFlags = yield* Schema.decodeUnknown(MemberFlagsSchema)(
            { active: true }
          );

          let result = 0;
          if (validatedFlags.active) result |= 1;
          return result;
        });

        const result = yield* dbService.obQuery('members.create', async (db) =>
          db
            .insertInto('members')
            .values({
              first_name: validatedData.first_name,
              last_name: validatedData.last_name,
              preferred_name: validatedData.preferred_name || null,
              email: validatedData.email,
              pronouns: validatedData.pronouns || null,
              sponsor_notes: validatedData.sponsor_notes || null,
              flags: flags.toString(),
            })
            .returning('id')
            .executeTakeFirstOrThrow()
        );

        return yield* getMemberById(result.id!);
      });

    const updateMember: IMemberService['updateMember'] = (data) =>
      Effect.gen(function* () {
        const validatedData =
          yield* Schema.decodeUnknown(UpdateMemberSchema)(data);

        const existingMember = yield* getMemberById(validatedData.id);

        // Check if email is being changed and if it conflicts
        if (
          validatedData.email &&
          validatedData.email !== existingMember.email
        ) {
          const emailConflict = yield* dbService.obQuery(
            'members.update.check',
            async (db) =>
              db
                .selectFrom('members')
                .select('id')
                .where('email', '=', validatedData.email!)
                .where('id', '!=', validatedData.id)
                .executeTakeFirst()
          );

          if (emailConflict) {
            return yield* new UniqueError({
              field: 'email',
              value: validatedData.email,
            });
          }
        }

        const updateData = Object.fromEntries(
          Object.entries(validatedData).filter(
            ([_, value]) => value !== undefined
          )
        );

        updateData.updated_at = new Date().toISOString();

        yield* dbService.obQuery('members.update', async (db) =>
          db
            .updateTable('members')
            .set(updateData)
            .where('id', '=', validatedData.id)
            .execute()
        );

        return yield* getMemberById(validatedData.id);
      });

    const deleteMember: IMemberService['deleteMember'] = (id) =>
      Effect.gen(function* () {
        const member = yield* getMemberById(id);

        // Soft delete by setting active flag to false
        const flags = member.flags & ~1; // Clear active bit

        yield* dbService.obQuery('members.delete', async (db) =>
          db
            .updateTable('members')
            .set({
              flags: flags.toString(),
              updated_at: new Date().toISOString(),
            })
            .where('id', '=', id)
            .execute()
        );
      });

    return {
      getMembers,
      getMemberById,
      createMember,
      updateMember,
      deleteMember,
    } satisfies IMemberService;
  })
).pipe(Layer.provide(DatabaseLive));

// Factory function for layer
export const getMemberServiceLayer = () => MemberServiceLive;
