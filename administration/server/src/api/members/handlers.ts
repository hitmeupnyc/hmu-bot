/**
 * Member API handlers using @effect/platform HttpApi
 * Implements the business logic for all member endpoints
 */

import { HttpApiBuilder } from "@effect/platform"
import { Effect } from "effect"
import { MemberService } from "~/services/effect/MemberEffects"
import { DatabaseError, NotFoundError, UniqueError } from "~/services/effect/errors/CommonErrors"
import { MemberNotFound, MemberEmailExists } from "./endpoints"
import { CurrentUser } from "~/middleware/auth"

// Factory function that takes the API as a parameter to avoid circular dependency
export const createMembersApiLive = (api: any) => HttpApiBuilder.group(
  api,
  "members", 
  (handlers) =>
    Effect.gen(function* () {
      const memberService = yield* MemberService
      
      return handlers
        .handle("listMembers", ({ urlParams }) =>
          Effect.gen(function* () {
            const page = urlParams.page ?? 1
            const limit = urlParams.limit ?? 20
            const search = urlParams.search
            
            const result = yield* memberService.getMembers({
              page,
              limit,
              search
            }).pipe(
              Effect.mapError((error) => {
                // Map service errors to API errors
                if (error instanceof DatabaseError) {
                  throw new Error("Database error occurred")
                }
                throw error
              })
            )
            
            return {
              data: result.members,
              total: result.pagination.total,
              page: result.pagination.page,
              limit: result.pagination.limit,
              totalPages: result.pagination.totalPages
            }
          })
        )
        
        .handle("getMember", ({ path }) =>
          Effect.gen(function* () {
            const member = yield* memberService.getMemberById(path.id)
              .pipe(
                Effect.mapError((error) => {
                  if (error instanceof NotFoundError) {
                    return new MemberNotFound({ memberId: path.id })
                  }
                  if (error instanceof DatabaseError) {
                    throw new Error("Database error occurred")
                  }
                  throw error
                })
              )
            
            return member
          })
        )
        
        .handle("createMember", ({ payload }) =>
          Effect.gen(function* () {
            const user = yield* CurrentUser
            
            const member = yield* memberService.createMember(payload)
              .pipe(
                Effect.mapError((error) => {
                  if (error instanceof UniqueError) {
                    return new MemberEmailExists({ email: payload.email })
                  }
                  if (error instanceof DatabaseError) {
                    throw new Error("Database error occurred")
                  }
                  throw error
                })
              )
            
            return member
          })
        )
        
        .handle("updateMember", ({ path, payload }) =>
          Effect.gen(function* () {
            const user = yield* CurrentUser
            
            // Create update payload with ID
            const updateData = { ...payload, id: path.id }
            
            const member = yield* memberService.updateMember(updateData)
              .pipe(
                Effect.mapError((error) => {
                  if (error instanceof NotFoundError) {
                    return new MemberNotFound({ memberId: path.id })
                  }
                  if (error instanceof UniqueError) {
                    return new MemberEmailExists({ email: payload.email || "" })
                  }
                  if (error instanceof DatabaseError) {
                    throw new Error("Database error occurred")
                  }
                  throw error
                })
              )
            
            return member
          })
        )
        
        .handle("deleteMember", ({ path }) =>
          Effect.gen(function* () {
            const user = yield* CurrentUser
            
            yield* memberService.deleteMember(path.id)
              .pipe(
                Effect.mapError((error) => {
                  if (error instanceof NotFoundError) {
                    return new MemberNotFound({ memberId: path.id })
                  }
                  if (error instanceof DatabaseError) {
                    throw new Error("Database error occurred")  
                  }
                  throw error
                })
              )
            
            return { message: "Member deleted successfully" }
          })
        )
    })
)