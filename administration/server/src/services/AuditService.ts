import { DatabaseService } from './DatabaseService';

export interface AuditLogEntry {
  entityType: string;
  entityId?: number;
  action: 'create' | 'update' | 'delete' | 'view' | 'search' | 'note';
  userSessionId?: string;
  userIp?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
}

export class AuditService {
  private static instance: AuditService;
  private dbService: DatabaseService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /**
   * Log an audit event
   */
  async logEvent(entry: AuditLogEntry): Promise<void> {
    try {
      await this.dbService.db
        .insertInto('audit_log')
        .values({
          entity_type: entry.entityType,
          entity_id: entry.entityId,
          action: entry.action,
          user_session_id: entry.userSessionId,
          user_ip: entry.userIp,
          old_values_json: entry.oldValues ? JSON.stringify(entry.oldValues) : null,
          new_values_json: entry.newValues ? JSON.stringify(entry.newValues) : null,
          metadata_json: entry.metadata ? JSON.stringify(entry.metadata) : null,
        })
        .execute();
    } catch (error) {
      // Don't let audit logging failures break the main application flow
      console.error('Failed to log audit event:', error);
    }
  }

  /**
   * Log a member view event
   */
  async logMemberView(memberId: number, sessionId?: string, userIp?: string): Promise<void> {
    await this.logEvent({
      entityType: 'member',
      entityId: memberId,
      action: 'view',
      userSessionId: sessionId,
      userIp,
    });
  }

  /**
   * Log a member search event
   */
  async logMemberSearch(searchTerm: string, filters: Record<string, any>, sessionId?: string, userIp?: string): Promise<void> {
    await this.logEvent({
      entityType: 'member',
      action: 'search',
      userSessionId: sessionId,
      userIp,
      metadata: {
        searchTerm,
        filters,
      },
    });
  }

  /**
   * Log a member creation event
   */
  async logMemberCreate(memberId: number, memberData: Record<string, any>, sessionId?: string, userIp?: string): Promise<void> {
    await this.logEvent({
      entityType: 'member',
      entityId: memberId,
      action: 'create',
      userSessionId: sessionId,
      userIp,
      newValues: memberData,
    });
  }

  /**
   * Log a member update event
   */
  async logMemberUpdate(
    memberId: number, 
    oldData: Record<string, any>, 
    newData: Record<string, any>, 
    sessionId?: string, 
    userIp?: string
  ): Promise<void> {
    await this.logEvent({
      entityType: 'member',
      entityId: memberId,
      action: 'update',
      userSessionId: sessionId,
      userIp,
      oldValues: oldData,
      newValues: newData,
    });
  }

  /**
   * Log a member deletion event
   */
  async logMemberDelete(memberId: number, memberData: Record<string, any>, sessionId?: string, userIp?: string): Promise<void> {
    await this.logEvent({
      entityType: 'member',
      entityId: memberId,
      action: 'delete',
      userSessionId: sessionId,
      userIp,
      oldValues: memberData,
    });
  }

  /**
   * Get audit log entries for a specific entity
   */
  async getAuditLog(entityType: string, entityId?: number, limit = 100): Promise<any[]> {
    let query = this.dbService.db
      .selectFrom('audit_log')
      .selectAll()
      .where('entity_type', '=', entityType)
      .orderBy('created_at', 'desc')
      .limit(limit);

    if (entityId !== undefined) {
      query = query.where('entity_id', '=', entityId);
    }

    const results = await query.execute();
    
    return results.map(row => ({
      ...row,
      oldValues: row.old_values_json ? JSON.parse(row.old_values_json) : null,
      newValues: row.new_values_json ? JSON.parse(row.new_values_json) : null,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : null,
    }));
  }

  /**
   * Log a note/comment event
   */
  async logNote(
    entityType: string,
    entityId: number,
    noteContent: string,
    tags: string[] = [],
    sessionId?: string,
    userIp?: string
  ): Promise<void> {
    await this.logEvent({
      entityType,
      entityId,
      action: 'note',
      userSessionId: sessionId,
      userIp,
      metadata: {
        content: noteContent,
        tags,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log a member note event
   */
  async logMemberNote(
    memberId: number,
    noteContent: string,
    tags: string[] = [],
    sessionId?: string,
    userIp?: string
  ): Promise<void> {
    await this.logNote('member', memberId, noteContent, tags, sessionId, userIp);
  }
}