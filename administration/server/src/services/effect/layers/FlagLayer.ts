import { Context, Data, Effect, Layer } from 'effect';
import { UnrecoverableError } from '../errors/CommonErrors';
import { DatabaseLive, DatabaseService } from './DatabaseLayer';

// Error types
export class FlagError extends Data.TaggedError('FlagError') {}

export interface ProcessingResult {
  processed: number;
  errors: number;
  duration: number;
}

export interface FlagGrantOptions {
  grantedBy: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

// Core service interface - all methods return Effects with no dependencies
export interface IFlag {
  readonly grantFlag: (
    userId: string,
    flagId: string,
    options: FlagGrantOptions
  ) => Effect.Effect<void, FlagError | UnrecoverableError, never>;

  readonly revokeFlag: (
    userId: string,
    flagId: string,
    revokedBy: string,
    reason?: string
  ) => Effect.Effect<void, FlagError | UnrecoverableError, never>;

  readonly getMemberFlags: (userId: string) => Effect.Effect<
    {
      flag_id: string;
      member_id: string;
      name: string;
      expires_at: string | null;
      granted_at: string | null;
      granted_by: string | null;
      metadata: string | null;
    }[],
    FlagError | UnrecoverableError,
    never
  >;

  readonly bulkGrantFlags: (
    assignments: Array<{
      userId: string;
      flagId: string;
      options: FlagGrantOptions;
    }>
  ) => Effect.Effect<void, FlagError | UnrecoverableError, never>;

  readonly processExpiredFlags: () => Effect.Effect<
    ProcessingResult,
    FlagError | UnrecoverableError,
    never
  >;
}

export const Flag = Context.GenericTag<IFlag>('Flag');

export const FlagLive = Layer.effect(
  Flag,
  Effect.gen(function* () {
    const dbService = yield* DatabaseService;

    const grantFlag: IFlag['grantFlag'] = (userId, flagId, options) =>
      Effect.gen(function* () {
        // Record in database
        yield* dbService.query((db) =>
          db.transaction().execute(async (trx) => {
            // Check if flag already exists for this member
            const existing = await trx
              .selectFrom('members_flags')
              .select(['member_id'])
              .where('member_id', '=', userId)
              .where('flag_id', '=', flagId)
              .executeTakeFirst();

            if (existing) {
              // Update existing flag grant
              await trx
                .updateTable('members_flags')
                .set({
                  granted_at: new Date().toISOString(),
                })
                .where('member_id', '=', userId)
                .where('flag_id', '=', flagId)
                .execute();
            } else {
              // Insert new flag grant
              await trx
                .insertInto('members_flags')
                .values({
                  member_id: userId,
                  flag_id: flagId,
                  granted_by: options.grantedBy,
                  granted_at: new Date().toISOString(),
                  expires_at: options.expiresAt?.toISOString(),
                  metadata: options.metadata
                    ? JSON.stringify(options.metadata)
                    : null,
                })
                .execute();
            }

            // todo: ensure audit logging is present
            // will probably need to happen after refactoring an audit log layer
          })
        );
      }).pipe(Effect.withSpan('grant-flag'));

    const revokeFlag: IFlag['revokeFlag'] = (
      userId: string,
      flagId: string,
      revokedBy: string,
      reason?: string
    ) =>
      Effect.gen(function* () {
        // Remove from database (hard delete since we don't have revoke fields)
        yield* dbService.query((db) =>
          db.transaction().execute(async (trx) => {
            // Delete the flag grant
            await trx
              .deleteFrom('members_flags')
              .where('member_id', '=', userId)
              .where('flag_id', '=', flagId)
              .execute();

            // todo: ensure audit logging is present
            // will probably need to happen after refactoring an audit log layer
          })
        );
      }).pipe(Effect.withSpan('revoke-flag'));

    const getMemberFlags: IFlag['getMemberFlags'] = (userId) =>
      Effect.gen(function* () {
        const member = yield* dbService.query((db) =>
          db
            .selectFrom('members')
            .select(['id'])
            .where('id', '=', parseInt(userId, 10))
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
            .where('mf.member_id', '=', userId)
            .execute()
        );

        return flags.map((flag) => ({
          flag_id: flag.id || '',
          member_id: flag.member_id,
          name: flag.name,
          expires_at: flag.expires_at,
          granted_at: flag.granted_at,
          granted_by: flag.granted_by,
          expired: flag.expires_at,
          metadata: flag.metadata,
        }));
      }).pipe(Effect.withSpan('get-member-flags'));

    const bulkGrantFlags: IFlag['bulkGrantFlags'] = (assignments) =>
      Effect.gen(function* () {
        // Update database - create members if they don't exist
        yield* dbService.query((db) =>
          db.transaction().execute(async (trx) => {
            for (const { userId, flagId, options } of assignments) {
              await trx
                .insertInto('members_flags')
                .values({
                  member_id: userId,
                  flag_id: flagId,
                  granted_by: options.grantedBy,
                  granted_at: new Date().toISOString(),
                  expires_at: options.expiresAt?.toISOString(),
                  metadata: options.metadata
                    ? JSON.stringify(options.metadata)
                    : null,
                })
                .onConflict((oc) =>
                  oc.columns(['member_id', 'flag_id']).doUpdateSet({
                    granted_at: new Date().toISOString(),
                    granted_by: options.grantedBy,
                    expires_at: options.expiresAt?.toISOString(),
                    metadata: options.metadata
                      ? JSON.stringify(options.metadata)
                      : null,
                  })
                )
                .execute();
            }
          })
        );

        console.log(`✅ Bulk granted ${assignments.length} flags`);
      }).pipe(Effect.withSpan('bulk-grant-flags'));

    const processExpiredFlags: IFlag['processExpiredFlags'] = () =>
      Effect.gen(function* () {
        const startTime = Date.now();
        let processed = 0;
        let errors = 0;

        console.log('🔄 Starting expired flag cleanup process...');

        const expiredFlags = yield* dbService.query((db) =>
          db
            .selectFrom('members_flags as mf')
            .innerJoin('members as m', 'm.id', 'mf.member_id')
            .select(['m.email', 'mf.flag_id', 'mf.granted_by'])
            .where('mf.expires_at', '<', new Date().toISOString())
            .limit(100)
            .execute()
        );

        for (const expiredFlag of expiredFlags) {
          try {
            yield* revokeFlag(
              expiredFlag.email,
              expiredFlag.flag_id,
              'system@automated',
              'Automatic expiration'
            );
            processed++;
            console.log(
              `⏰ Expired flag ${expiredFlag.flag_id} for member ${expiredFlag.email}`
            );
          } catch (error) {
            errors++;
            console.error(
              `❌ Failed to revoke expired flag ${expiredFlag.flag_id} for ${expiredFlag.email}:`,
              error
            );
          }
        }

        const duration = Date.now() - startTime;
        console.log(
          `✅ Expiration cleanup completed: ${processed} flags processed, ${errors} errors, ${duration}ms`
        );

        return { processed, errors, duration };
      }).pipe(Effect.withSpan('process-expired-flags'));

    return {
      grantFlag,
      revokeFlag,
      getMemberFlags,
      bulkGrantFlags,
      processExpiredFlags,
    } satisfies IFlag;
  })
).pipe(Layer.provide(DatabaseLive));
