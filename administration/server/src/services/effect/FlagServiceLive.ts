import { Effect, Layer } from 'effect';
import { NotFoundError } from './errors/CommonErrors';
import {
  FlagError,
  FlagGrantOptions,
  FlagService,
  IFlagService,
  MemberFlagDetails,
  ProcessingResult,
} from './FlagService';
import { DatabaseLive, DatabaseService } from './layers/DatabaseLayer';

// Service implementation that provides the FlagService with resolved dependencies
export const FlagServiceLive = Layer.effect(
  FlagService,
  Effect.gen(function* () {
    const dbService = yield* DatabaseService;

    const grantFlag = (
      userId: string,
      flagId: string,
      options: FlagGrantOptions
    ): Effect.Effect<void, NotFoundError | FlagError, never> =>
      Effect.gen(function* () {
        // Find or create member
        let member = yield* dbService.query((db) =>
          db
            .selectFrom('members')
            .select(['id', 'email'])
            .where('id', '=', parseInt(userId))
            .executeTakeFirst()
        );

        // If member doesn't exist, create them
        if (!member) {
          return yield* Effect.fail(
            new NotFoundError({ id: userId, resource: 'member' })
          );
        }

        // Validate flag exists
        const flag = yield* dbService.query((db) =>
          db
            .selectFrom('flags')
            .select(['id', 'name'])
            .where('id', '=', flagId)
            .executeTakeFirst()
        );

        if (!flag) {
          return yield* Effect.fail(
            new NotFoundError({ id: flagId, resource: 'flag' })
          );
        }

        // Record in database
        yield* dbService
          .query((db) =>
            db.transaction().execute(async (trx) => {
              // Check if flag already exists for this member
              const existing = await trx
                .selectFrom('members_flags')
                .select(['member_id'])
                .where('member_id', '=', member.id!.toString())
                .where('flag_id', '=', flagId)
                .executeTakeFirst();

              if (existing) {
                // Update existing flag grant
                await trx
                  .updateTable('members_flags')
                  .set({
                    granted_at: new Date().toISOString(),
                    granted_by: options.grantedBy,
                    expires_at: options.expiresAt?.toISOString(),
                    metadata: options.metadata
                      ? JSON.stringify(options.metadata)
                      : null,
                  })
                  .where('member_id', '=', member.id!.toString())
                  .where('flag_id', '=', flagId)
                  .execute();
              } else {
                // Insert new flag grant
                await trx
                  .insertInto('members_flags')
                  .values({
                    member_id: member.id!.toString(),
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

              // Audit log
              await trx
                .insertInto('audit_log')
                .values({
                  user_id: options.grantedBy,
                  action: 'flag.grant',
                  entity_type: 'member_flag',
                  entity_id: parseInt(member.id!.toString()),
                  metadata_json: JSON.stringify({
                    member_email: member.email,
                    flag_id: flagId,
                    expires_at: options.expiresAt,
                    reason: options.reason,
                    ip_address: options.ipAddress,
                  }),
                  created_at: new Date().toISOString(),
                })
                .execute();
            })
          )
          .pipe(
            Effect.mapError(
              (error) => new FlagError('Failed to record flag grant', error)
            )
          );

        console.log(
          `✅ Granted flag '${flagId}' to ${member.email} by ${options.grantedBy}`
        );
      });

    const revokeFlag = (
      userId: string,
      flagId: string,
      revokedBy: string,
      reason?: string
    ): Effect.Effect<void, FlagError, never> =>
      Effect.gen(function* () {
        // Get member
        const member = yield* dbService
          .query((db) =>
            db
              .selectFrom('members')
              .select(['id', 'email'])
              .where('id', '=', parseInt(userId, 10))
              .executeTakeFirst()
          )
          .pipe(
            Effect.mapError(
              (error) => new FlagError('Failed to find member', error)
            )
          );

        if (!member) {
          return yield* Effect.fail(
            new FlagError(`Member ${userId} not found`)
          );
        }

        // Remove from database (hard delete since we don't have revoke fields)
        yield* dbService
          .query((db) =>
            db.transaction().execute(async (trx) => {
              // Delete the flag grant
              await trx
                .deleteFrom('members_flags')
                .where('member_id', '=', member.id!.toString())
                .where('flag_id', '=', flagId)
                .execute();

              // Audit log
              await trx
                .insertInto('audit_log')
                .values({
                  user_id: revokedBy,
                  action: 'flag.revoke',
                  entity_type: 'member_flag',
                  entity_id: parseInt(member.id!.toString()),
                  metadata_json: JSON.stringify({
                    member_email: member.email,
                    flag_id: flagId,
                    reason: reason,
                  }),
                  created_at: new Date().toISOString(),
                })
                .execute();
            })
          )
          .pipe(
            Effect.mapError(
              (error) =>
                new FlagError('Failed to record flag revocation', error)
            )
          );

        console.log(
          `✅ Revoked flag '${flagId}' from ${member.email} by ${revokedBy}`
        );
      });

    const getMemberFlags = (
      userId: string
    ): Effect.Effect<MemberFlagDetails[], FlagError, never> =>
      Effect.gen(function* () {
        const member = yield* dbService
          .query((db) =>
            db
              .selectFrom('members')
              .select(['id'])
              .where('id', '=', parseInt(userId, 10))
              .executeTakeFirst()
          )
          .pipe(
            Effect.mapError(
              (error) => new FlagError('Failed to find member', error)
            )
          );

        if (!member) {
          return [];
        }

        const flags = yield* dbService
          .query((db) =>
            db
              .selectFrom('members_flags as mf')
              .innerJoin('flags as f', 'f.id', 'mf.flag_id')
              .select([
                'f.id',
                'f.name',
                'mf.granted_at',
                'mf.expires_at',
                'mf.granted_by',
                'mf.metadata',
              ])
              .where('mf.member_id', '=', member.id!.toString())
              .execute()
          )
          .pipe(
            Effect.mapError(
              (error) => new FlagError('Failed to fetch member flags', error)
            )
          );

        return flags.map(
          (flag): MemberFlagDetails => ({
            id: flag.id || '',
            name: flag.name,
            description: undefined, // No description field in flags table
            category: undefined, // No category field in flags table
            grantedAt: new Date(flag.granted_at || new Date().toISOString()),
            expiresAt: flag.expires_at ? new Date(flag.expires_at) : undefined,
            grantedBy: flag.granted_by || 'unknown',
            expired: flag.expires_at
              ? new Date(flag.expires_at) < new Date()
              : false,
            metadata: flag.metadata
              ? JSON.parse(flag.metadata as string)
              : undefined,
          })
        );
      });

    const bulkGrantFlags = (
      assignments: Array<{
        userId: string;
        flagId: string;
        options: FlagGrantOptions;
      }>
    ): Effect.Effect<void, FlagError, never> =>
      Effect.gen(function* () {
        // Update database - create members if they don't exist
        yield* dbService
          .query((db) =>
            db.transaction().execute(async (trx) => {
              for (const { userId, flagId, options } of assignments) {
                let member = await trx
                  .selectFrom('members')
                  .select(['id'])
                  .where('id', '=', parseInt(userId, 10))
                  .executeTakeFirst();

                // Create member if they don't exist
                if (!member) {
                  throw new NotFoundError({ id: userId, resource: 'member' });
                }

                await trx
                  .insertInto('members_flags')
                  .values({
                    member_id: member.id!.toString(),
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
          )
          .pipe(
            Effect.mapError(
              (error) => new FlagError('Failed to bulk update database', error)
            )
          );

        console.log(`✅ Bulk granted ${assignments.length} flags`);
      });

    const processExpiredFlags = (): Effect.Effect<
      ProcessingResult,
      FlagError,
      never
    > =>
      Effect.gen(function* () {
        const startTime = Date.now();
        let processed = 0;
        let errors = 0;

        console.log('🔄 Starting expired flag cleanup process...');

        const expiredFlags = yield* dbService
          .query((db) =>
            db
              .selectFrom('members_flags as mf')
              .innerJoin('members as m', 'm.id', 'mf.member_id')
              .select(['m.email', 'mf.flag_id', 'mf.granted_by'])
              .where('mf.expires_at', '<', new Date().toISOString())
              .limit(100)
              .execute()
          )
          .pipe(
            Effect.mapError(
              (error) => new FlagError('Failed to fetch expired flags', error)
            )
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
      });

    return {
      grantFlag,
      revokeFlag,
      getMemberFlags,
      bulkGrantFlags,
      processExpiredFlags,
    } satisfies IFlagService;
  })
).pipe(Layer.provide(DatabaseLive));
