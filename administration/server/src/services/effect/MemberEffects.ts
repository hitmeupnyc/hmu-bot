import { Context, Effect, Layer, Schema } from 'effect';
import { DatabaseLive, DatabaseService } from './layers/DatabaseLayer';
import {
  CreateMemberSchema,
  MemberFlagsSchema,
  MemberQueryOptionsSchema,
  MemberSchema,
  UpdateMemberSchema,
  type CreateMember,
  type MemberQueryOptions,
  type UpdateMember,
} from './schemas/MemberSchemas';

// Import the database error for interface types
import {
  DatabaseError,
  NotFoundError,
  ParseError,
  UniqueError,
} from './errors/CommonErrors';

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
    ParseError | DatabaseError,
    never
  >;

  readonly getMemberById: (
    id: number
  ) => Effect.Effect<
    typeof MemberSchema.Type,
    NotFoundError | DatabaseError | ParseError,
    never
  >;

  readonly createMember: (
    data: CreateMember
  ) => Effect.Effect<
    typeof MemberSchema.Type,
    UniqueError | ParseError | NotFoundError | DatabaseError,
    never
  >;

  readonly updateMember: (
    data: UpdateMember
  ) => Effect.Effect<
    typeof MemberSchema.Type,
    NotFoundError | UniqueError | ParseError | DatabaseError,
    never
  >;

  readonly deleteMember: (
    id: number
  ) => Effect.Effect<void, NotFoundError | DatabaseError | ParseError, never>;
}

export const MemberService =
  Context.GenericTag<IMemberService>('MemberService');

// Service implementation layer
export const MemberServiceLive = Layer.effect(
  MemberService,
  Effect.gen(function* () {
    const dbService = yield* DatabaseService;

    const getMembers = (
      options: MemberQueryOptions
    ): Effect.Effect<
      {
        members: (typeof MemberSchema.Type)[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      },
      ParseError | DatabaseError,
      never
    > =>
      Effect.gen(function* () {
        const validatedOptions = yield* Schema.decodeUnknown(
          MemberQueryOptionsSchema
        )(options);

        const { page, limit, search } = validatedOptions;
        const offset = (page - 1) * limit;

        const [countResult, memberRows] = yield* dbService.query(async (db) => {
          let query = db
            .selectFrom('members')
            .where((eb) => eb('flags', '&', '1'), '=', '1'); // Only active members

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
            .selectAll()
            .orderBy('created_at', 'desc')
            .limit(limit)
            .offset(offset);

          return Promise.all([
            countQuery.executeTakeFirst() as Promise<{ total: string }>,
            selectQuery.execute(),
          ]);
        });

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

    const getMemberById = (
      id: number
    ): Effect.Effect<
      typeof MemberSchema.Type,
      NotFoundError | DatabaseError | ParseError,
      never
    > =>
      Effect.gen(function* () {
        const member = yield* dbService.query(async (db) =>
          db
            .selectFrom('members')
            .selectAll()
            .where('id', '=', id)
            .where((eb) => eb('flags', '&', '1'), '=', '1')
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

    const createMember = (
      data: CreateMember
    ): Effect.Effect<
      typeof MemberSchema.Type,
      UniqueError | ParseError | NotFoundError | DatabaseError,
      never
    > =>
      Effect.gen(function* () {
        const validatedData =
          yield* Schema.decodeUnknown(CreateMemberSchema)(data);

        // Check if email already exists
        const existingMember = yield* dbService.query(async (db) =>
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
            {
              active: true,
              professional_affiliate: validatedData.is_professional_affiliate,
            }
          );

          let result = 0;
          if (validatedFlags.active) result |= 1;
          if (validatedFlags.professional_affiliate) result |= 2;
          return result;
        });

        const result = yield* dbService.query(async (db) =>
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

    const updateMember = (
      data: UpdateMember
    ): Effect.Effect<
      typeof MemberSchema.Type,
      NotFoundError | UniqueError | ParseError | DatabaseError,
      never
    > =>
      Effect.gen(function* () {
        const validatedData =
          yield* Schema.decodeUnknown(UpdateMemberSchema)(data);

        const existingMember = yield* getMemberById(validatedData.id);

        // Check if email is being changed and if it conflicts
        if (
          validatedData.email &&
          validatedData.email !== existingMember.email
        ) {
          const emailConflict = yield* dbService.query(async (db) =>
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

        const updateData: Record<string, any> = {};

        if (validatedData.first_name !== undefined) {
          updateData.first_name = validatedData.first_name;
        }
        if (validatedData.last_name !== undefined) {
          updateData.last_name = validatedData.last_name;
        }
        if (validatedData.preferred_name !== undefined) {
          updateData.preferred_name = validatedData.preferred_name;
        }
        if (validatedData.email !== undefined) {
          updateData.email = validatedData.email;
        }
        if (validatedData.pronouns !== undefined) {
          updateData.pronouns = validatedData.pronouns;
        }
        if (validatedData.sponsor_notes !== undefined) {
          updateData.sponsor_notes = validatedData.sponsor_notes;
        }

        updateData.updated_at = new Date().toISOString();

        yield* dbService.query(async (db) =>
          db
            .updateTable('members')
            .set(updateData)
            .where('id', '=', validatedData.id)
            .execute()
        );

        return yield* getMemberById(validatedData.id);
      });

    const deleteMember = (
      id: number
    ): Effect.Effect<void, NotFoundError | DatabaseError | ParseError, never> =>
      Effect.gen(function* () {
        const member = yield* getMemberById(id);

        // Soft delete by setting active flag to false
        const flags = member.flags & ~1; // Clear active bit

        yield* dbService.query(async (db) =>
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
