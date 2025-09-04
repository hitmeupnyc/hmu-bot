import { HttpApiBuilder } from '@effect/platform';
import { Effect, Layer } from 'effect';
import { DatabaseError } from '~/api/errors';
import {
  DatabaseLive,
  DatabaseService,
} from '~/services/effect/layers/DatabaseLayer';
import { auditApi } from './endpoints';

export const AuditApiLive = HttpApiBuilder.group(
  auditApi,
  'audit',
  (handlers) =>
    Effect.gen(function* () {
      const dbService = yield* DatabaseService;

      return handlers.handle('api.audit.list', ({ urlParams }) =>
        Effect.gen(function* () {
          const entity_type = urlParams.entity_type;
          const entity_id = urlParams.entity_id;
          const limit = urlParams.limit ?? 50;
          const offset = urlParams.offset ?? 0;

          // Build query with optional filters
          const [logs, totalCount] = yield* Effect.all([
            // Get audit logs
            dbService
              .query(async (db) => {
                let query = db
                  .selectFrom('audit_log')
                  .selectAll()
                  .orderBy('created_at', 'desc')
                  .limit(limit)
                  .offset(offset);

                if (entity_type) {
                  query = query.where('entity_type', '=', entity_type);
                }

                if (entity_id !== undefined) {
                  query = query.where('entity_id', '=', entity_id);
                }

                return query.execute();
              })
              .pipe(
                Effect.mapError((error) => {
                  return new DatabaseError({
                    message: 'Failed to fetch audit logs',
                  });
                })
              ),

            // Get total count for pagination
            dbService
              .query(async (db) => {
                let countQuery = db
                  .selectFrom('audit_log')
                  .select((eb) => eb.fn.countAll().as('count'));

                if (entity_type) {
                  countQuery = countQuery.where(
                    'entity_type',
                    '=',
                    entity_type
                  );
                }

                if (entity_id !== undefined) {
                  countQuery = countQuery.where('entity_id', '=', entity_id);
                }

                const result = await countQuery.executeTakeFirst();
                return Number(result?.count) || 0;
              })
              .pipe(
                Effect.mapError((error) => {
                  return new DatabaseError({
                    message: 'Failed to count audit logs',
                  });
                })
              ),
          ]);

          return {
            data: logs.map((log) => ({
              ...log,
              id: log.id || undefined,
              entity_id: log.entity_id || undefined,
              user_session_id: log.user_session_id || undefined,
              user_id: log.user_id || undefined,
              user_email: log.user_email || undefined,
              user_ip: log.user_ip || undefined,
              old_values_json: log.old_values_json || undefined,
              new_values_json: log.new_values_json || undefined,
              metadata_json: log.metadata_json || undefined,
              created_at: log.created_at || undefined,
              metadata: log.metadata_json
                ? JSON.parse(log.metadata_json)
                : undefined,
              new_values: log.new_values_json
                ? JSON.parse(log.new_values_json)
                : undefined,
              old_values: log.old_values_json
                ? JSON.parse(log.old_values_json)
                : undefined,
            })),
            total: totalCount,
            limit,
            offset,
          };
        })
      );
    })
).pipe(Layer.provide(DatabaseLive));
