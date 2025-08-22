import { Context, Effect, Schema } from 'effect';
import type { Request } from 'express';

/**
 * Context tag for parsed request body
 * This allows subsequent effects to access the validated body data
 */
export class ParsedBody<T> extends Context.Tag("ParsedBody")<ParsedBody<T>, T>() {}

/**
 * Parse and validate request body, making it available via Context
 * 
 * This replaces the pattern of manually accessing req.body in controllers
 * and provides type-safe access to validated data in subsequent effects
 */
export const parseBody = <A, I, R>(
  schema: Schema.Schema<A, I, R>
): Effect.Effect<void, Schema.ParseError, R | ParsedBody<A>> =>
  Effect.gen(function* () {
    const parsed = yield* Schema.decodeUnknown(schema)(req.body);
    yield* Effect.provideService(ParsedBody<A>, parsed);
  });

/**
 * Get the parsed body from context
 * Used in controllers to access the validated body data
 */
export const getParsedBody = <T>(): Effect.Effect<T, never, ParsedBody<T>> =>
  ParsedBody<T>;

/**
 * Example usage:
 * 
 * // In route definition:
 * router.post(
 *   '/',
 *   effectToExpress((req, res) =>
 *     Effect.gen(function* () {
 *       // Parse body and make it available in context
 *       yield* parseBody(createMemberSchema)(req);
 *       
 *       // Controller now has access to parsed body via context
 *       return yield* MemberController.createMember(req, res);
 *     })
 *   )
 * );
 * 
 * // In controller:
 * export const createMember = (req: Request, res: Response) =>
 *   Effect.gen(function* () {
 *     // Get validated body from context instead of req.body
 *     const memberData = yield* getParsedBody();
 *     const memberService = yield* MemberService;
 *     const member = yield* memberService.createMember(memberData);
 *     return createSuccessResponse(member);
 *   });
 */