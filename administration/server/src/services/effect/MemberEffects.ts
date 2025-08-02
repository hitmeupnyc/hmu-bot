import { Effect, pipe } from "effect"
import * as Schema from "effect/Schema"
import { DatabaseService } from "./context/DatabaseService"
import { 
  MemberSchema, 
  CreateMemberSchema, 
  UpdateMemberSchema,
  MemberFlagsSchema,
  MemberQueryOptionsSchema,
  MemberMembershipSchema,
  type Member,
  type CreateMember,
  type UpdateMember,
  type MemberQueryOptions,
  type MemberMembership
} from "./schemas/MemberSchemas"
import { 
  MemberNotFound, 
  EmailAlreadyExists, 
  InvalidEmail,
  MemberValidationError,
  MemberUpdateError
} from "./errors/MemberErrors"
import { DatabaseError } from "./errors/DatabaseErrors"

/**
 * Internal helper to get member by ID without audit logging
 */
const getMemberByIdInternal = (id: number) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService
    
    const member = yield* db.query(async (db) =>
      db.selectFrom('members')
        .selectAll()
        .where('id', '=', id)
        .where(eb => eb('flags', '&', 1), '=', 1)
        .executeTakeFirst()
    )
    
    if (!member) {
      return yield* new MemberNotFound({ memberId: id })
    }
    
    return yield* Schema.decodeUnknown(MemberSchema)(member)
  })

/**
 * Get paginated members with optional search
 */
export const getMembers = (options: MemberQueryOptions) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService
    const validatedOptions = yield* Schema.decodeUnknown(MemberQueryOptionsSchema)(options)
    
    const { page, limit, search } = validatedOptions
    const offset = (page - 1) * limit

    const [countResult, memberRows] = yield* db.query(async (db) => {
      let query = db
        .selectFrom('members')
        .where(eb => eb('flags', '&', 1), '=', 1) // Only active members

      if (search) {
        const searchTerm = `%${search}%`
        query = query.where(eb =>
          eb.or([
            eb('first_name', 'like', searchTerm),
            eb('last_name', 'like', searchTerm),
            eb('email', 'like', searchTerm)
          ])
        )
      }

      const countQuery = query
        .clearSelect()
        .select(eb => eb.fn.count('id').as('total'))

      const selectQuery = query
        .selectAll()
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset)

      return Promise.all([
        countQuery.executeTakeFirst() as Promise<{ total: string }>,
        selectQuery.execute()
      ])
    })
    
    const members = yield* Effect.forEach(
      memberRows,
      (row) => Schema.decodeUnknown(MemberSchema)(row)
    )

    const total = parseInt(countResult?.total || '0')
    const totalPages = Math.ceil(total / limit)

    return {
      members,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    }
  }).pipe(
    Effect.mapError((error) => 
      error._tag === "ParseError" 
        ? new MemberValidationError({ 
            field: "query_options", 
            message: `Invalid query options: ${error.message}` 
          })
        : error
    )
  )

/**
 * Get member by ID with optional audit logging
 */
export const getMemberById = (id: number, auditInfo?: { sessionId: string; userIp: string }) =>
  Effect.gen(function* () {
    const member = yield* getMemberByIdInternal(id)
    
    // TODO: Add audit logging effect here if auditInfo provided
    // This would be implemented as a separate Effect that logs the view
    
    return member
  })

/**
 * Build member flags from boolean flags object
 */
const buildMemberFlags = (flags: { active: boolean; professional_affiliate?: boolean }) =>
  Effect.gen(function* () {
    const validatedFlags = yield* Schema.decodeUnknown(MemberFlagsSchema)(flags)
    
    let result = 0
    if (validatedFlags.active) result |= 1
    if (validatedFlags.professional_affiliate) result |= 2
    return result
  })

/**
 * Create a new member
 */
export const createMember = (data: CreateMember) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService
    const validatedData = yield* Schema.decodeUnknown(CreateMemberSchema)(data)
    
    // Check if email already exists
    const existingMember = yield* db.query(async (db) =>
      db.selectFrom('members')
        .select('id')
        .where('email', '=', validatedData.email)
        .executeTakeFirst()
    )
    
    if (existingMember) {
      return yield* new EmailAlreadyExists({ email: validatedData.email })
    }

    const flags = yield* buildMemberFlags({
      active: true,
      professional_affiliate: validatedData.is_professional_affiliate
    })

    const result = yield* db.query(async (db) =>
      db.insertInto('members')
        .values({
          first_name: validatedData.first_name,
          last_name: validatedData.last_name,
          preferred_name: validatedData.preferred_name || null,
          email: validatedData.email,
          pronouns: validatedData.pronouns || null,
          sponsor_notes: validatedData.sponsor_notes || null,
          flags
        })
        .returning('id')
        .executeTakeFirstOrThrow()
    )

    return yield* getMemberByIdInternal(result.id)
  }).pipe(
    Effect.mapError((error) => 
      error._tag === "ParseError" 
        ? new MemberValidationError({ 
            field: "member_data", 
            message: `Invalid member data: ${error.message}` 
          })
        : error
    )
  )

/**
 * Update an existing member
 */
export const updateMember = (data: UpdateMember, auditInfo?: { sessionId: string; userIp: string }) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService
    const validatedData = yield* Schema.decodeUnknown(UpdateMemberSchema)(data)
    
    const existingMember = yield* getMemberByIdInternal(validatedData.id)

    // Check if email is being changed and if it conflicts
    if (validatedData.email && validatedData.email !== existingMember.email) {
      const emailConflict = yield* db.query(async (db) =>
        db.selectFrom('members')
          .select('id')
          .where('email', '=', validatedData.email)
          .where('id', '!=', validatedData.id)
          .executeTakeFirst()
      )

      if (emailConflict) {
        return yield* new EmailAlreadyExists({ email: validatedData.email })
      }
    }

    const updateData: Record<string, any> = {}

    if (validatedData.first_name !== undefined) {
      updateData.first_name = validatedData.first_name
    }
    if (validatedData.last_name !== undefined) {
      updateData.last_name = validatedData.last_name
    }
    if (validatedData.preferred_name !== undefined) {
      updateData.preferred_name = validatedData.preferred_name
    }
    if (validatedData.email !== undefined) {
      updateData.email = validatedData.email
    }
    if (validatedData.pronouns !== undefined) {
      updateData.pronouns = validatedData.pronouns
    }
    if (validatedData.sponsor_notes !== undefined) {
      updateData.sponsor_notes = validatedData.sponsor_notes
    }

    updateData.updated_at = new Date().toISOString()

    yield* db.query(async (db) =>
      db.updateTable('members')
        .set(updateData)
        .where('id', '=', validatedData.id)
        .execute()
    )

    const updatedMember = yield* getMemberByIdInternal(validatedData.id)

    // TODO: Add audit logging effect here if auditInfo provided
    
    return updatedMember
  }).pipe(
    Effect.mapError((error) => 
      error._tag === "ParseError" 
        ? new MemberValidationError({ 
            field: "update_data", 
            message: `Invalid update data: ${error.message}` 
          })
        : error
    )
  )

/**
 * Soft delete a member by clearing active flag
 */
export const deleteMember = (id: number) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService
    const member = yield* getMemberByIdInternal(id)

    // Soft delete by setting active flag to false
    const flags = member.flags & ~1 // Clear active bit

    yield* db.query(async (db) =>
      db.updateTable('members')
        .set({
          flags,
          updated_at: new Date().toISOString()
        })
        .where('id', '=', id)
        .execute()
    )
  })

/**
 * Get member's memberships
 */
export const getMemberMemberships = (memberId: number) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService
    
    // Ensure member exists
    yield* getMemberByIdInternal(memberId)

    const membershipRows = yield* db.query(async (db) =>
      db.selectFrom('member_memberships as mm')
        .innerJoin('membership_types as mt', 'mm.membership_type_id', 'mt.id')
        .leftJoin('payment_statuses as ps', 'mm.payment_status_id', 'ps.id')
        .select([
          'mm.id',
          'mm.member_id',
          'mm.membership_type_id',
          'mm.payment_status_id',
          'mm.start_date',
          'mm.end_date',
          'mt.name as membership_name',
          'ps.name as payment_status_name'
        ])
        .where('mm.member_id', '=', memberId)
        .orderBy('mm.start_date', 'desc')
        .execute()
    )
    
    return yield* Effect.forEach(
      membershipRows,
      (row) => Schema.decodeUnknown(MemberMembershipSchema)(row)
    )
  })

/**
 * Get member's events
 */
export const getMemberEvents = (memberId: number) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService
    
    // Ensure member exists
    yield* getMemberByIdInternal(memberId)

    const eventRows = yield* db.query(async (db) =>
      db.selectFrom('events as e')
        .innerJoin('event_attendance as ea', 'e.id', 'ea.event_id')
        .selectAll('e')
        .select([
          'ea.checked_in_at',
          'ea.checked_out_at', 
          'ea.attendance_source'
        ])
        .where('ea.member_id', '=', memberId)
        .orderBy('e.start_datetime', 'desc')
        .execute()
    )
    
    // Return raw events for now - could add event schema later
    return eventRows
  })