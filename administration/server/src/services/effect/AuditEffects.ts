import { Context, Effect, Layer, pipe, Schema } from 'effect';
import { DatabaseError, ParseError } from './errors/CommonErrors';
import { DatabaseLive, DatabaseService } from './layers/DatabaseLayer';
import { Audit, AuditSchema } from './schemas/AuditSchema';

// Service interface
export interface IAuditService {
  readonly logAuditEvent: (
    entry: Audit
  ) => Effect.Effect<Audit, DatabaseError | ParseError, never>;

  readonly getAuditLogs: (
    entityType: string,
    entityId?: number,
    limit?: number
  ) => Effect.Effect<Array<Audit>, DatabaseError | ParseError, never>;
}

export const AuditService = Context.GenericTag<IAuditService>('AuditService');

// Service implementation layer
export const AuditServiceLive = Layer.effect(
  AuditService,
  Effect.gen(function* () {
    const dbService = yield* DatabaseService;

    const logAuditEvent = (
      entry: Audit
    ): Effect.Effect<Audit, DatabaseError | ParseError, never> =>
      Effect.gen(function* () {
        const validatedEntry = yield* pipe(
          Schema.decodeUnknown(AuditSchema)(entry),
          Effect.catchTag('ParseError', (error) => Effect.fail(error))
        );

        const auditLog = {
          ...validatedEntry,
          old_values_json: validatedEntry.oldValues
            ? JSON.stringify(validatedEntry.oldValues)
            : null,
          new_values_json: validatedEntry.newValues
            ? JSON.stringify(validatedEntry.newValues)
            : null,
          metadata_json: validatedEntry.metadata
            ? JSON.stringify(validatedEntry.metadata)
            : null,
        };

        yield* dbService.query(async (db) =>
          db.insertInto('audit_log').values(auditLog).execute()
        );
        return auditLog;
      });

    const getAuditLogs = (
      entityType: string,
      entityId?: number,
      limit: number = 50
    ): Effect.Effect<Array<Audit>, DatabaseError | ParseError, never> =>
      Effect.gen(function* () {
        const logs = yield* dbService.query(async (db) => {
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
          entity_type: log.entity_type,
          entity_id: log.entity_id || undefined,
          action: log.action as
            | 'create'
            | 'update'
            | 'delete'
            | 'view'
            | 'search'
            | 'note',
          userSessionId: log.user_session_id || undefined,
          userIp: log.user_ip || undefined,
          userEmail: log.user_email || undefined,
          userId: log.user_id || undefined,
          metadata: log.metadata_json ? JSON.parse(log.metadata_json) : null,
          oldValues: log.old_values_json
            ? JSON.parse(log.old_values_json)
            : null,
          newValues: log.new_values_json
            ? JSON.parse(log.new_values_json)
            : null,
        }));
      });

    return {
      logAuditEvent,
      getAuditLogs,
    };
  })
).pipe(Layer.provide(DatabaseLive));

// Factory function for layer
export const getAuditServiceLayer = () => AuditServiceLive;
