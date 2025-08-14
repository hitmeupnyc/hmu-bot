import { Effect, pipe, Schema } from 'effect';
import { DatabaseService } from './context/DatabaseService';
import { Audit, AuditSchema } from './schemas/AuditSchema';

/**
 * Log an audit event
 */
export const logAuditEvent = (entry: Audit) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const validatedEntry = yield* Schema.decodeUnknown(AuditSchema)(entry);

    // Non-failing audit logging - errors are logged but don't throw
    return yield* pipe(
      db.query(async (db) =>
        db
          .insertInto('audit_log')
          .values({
            entity_type: validatedEntry.entity_type,
            entity_id: validatedEntry.entity_id || null,
            action: validatedEntry.action,
            user_session_id: validatedEntry.userSessionId || null,
            user_ip: validatedEntry.userIp || null,
            user_email: validatedEntry.userEmail || null,
            user_id: validatedEntry.userId || null,
            old_values_json: validatedEntry.oldValues
              ? JSON.stringify(validatedEntry.oldValues)
              : null,
            new_values_json: validatedEntry.newValues
              ? JSON.stringify(validatedEntry.newValues)
              : null,
            metadata_json: validatedEntry.metadata
              ? JSON.stringify(validatedEntry.metadata)
              : null,
          })
          .execute()
      ),
      Effect.catchAll((error) =>
        Effect.sync(() => {
          console.error('Failed to log audit event:', error);
          return null; // Return null instead of failing
        })
      )
    );
  });

/**
 * Get audit logs for an entity
 */
export const getAuditLogs = (
  entityType: string,
  entityId?: number,
  limit: number = 50
) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    const logs = yield* db.query(async (db) => {
      let query = db
        .selectFrom('audit_log')
        .selectAll()
        .where('entity_type', '=', entityType)
        .orderBy('created_at', 'desc')
        .limit(limit);

      if (entityId) {
        query = query.where('entity_id', '=', entityId);
      }

      return query.execute();
    });

    return logs.map((log) => ({
      ...log,
      metadata: log.metadata_json ? JSON.parse(log.metadata_json) : null,
      oldValues: log.old_values_json ? JSON.parse(log.old_values_json) : null,
      newValues: log.new_values_json ? JSON.parse(log.new_values_json) : null,
    }));
  });
