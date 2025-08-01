import crypto from 'crypto';
import { prepare } from './DatabaseService';
import { SyncOperation, Member } from '../types';

export abstract class BaseSyncService {
  /**
   * Create a new sync operation record
   */
  protected async createSyncOperation(data: Omit<SyncOperation, 'id' | 'created_at'>): Promise<SyncOperation> {
    const stmt = prepare(`
      INSERT INTO sync_operations (platform, operation_type, external_id, member_id, status, payload_json, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.platform,
      data.operation_type,
      data.external_id,
      data.member_id || null,
      data.status,
      data.payload_json,
      data.error_message || null,
      new Date().toISOString()
    );

    return prepare('SELECT * FROM sync_operations WHERE id = ?').get(result.lastInsertRowid) as SyncOperation;
  }

  /**
   * Update an existing sync operation
   */
  protected async updateSyncOperation(id: number, status: string, message?: string, memberId?: number): Promise<void> {
    const stmt = prepare(`
      UPDATE sync_operations 
      SET status = ?, error_message = ?, member_id = ?, processed_at = ?
      WHERE id = ?
    `);

    stmt.run(status, message || null, memberId || null, new Date().toISOString(), id);
  }

  /**
   * Find member by email
   */
  protected async findMemberByEmail(email: string): Promise<Member | null> {
    const stmt = prepare('SELECT * FROM members WHERE email = ?');
    const member = stmt.get(email) as Member | undefined;
    return member || null;
  }

  /**
   * Update member flags using bitwise operations
   */
  protected async updateMemberFlag(memberId: number, flag: number, value: boolean): Promise<void> {
    const member = prepare('SELECT flags FROM members WHERE id = ?').get(memberId) as { flags: number };
    
    let newFlags = member.flags;
    if (value) {
      newFlags |= flag; // Set flag
    } else {
      newFlags &= ~flag; // Unset flag
    }

    const stmt = prepare('UPDATE members SET flags = ?, updated_at = ? WHERE id = ?');
    stmt.run(newFlags, new Date().toISOString(), memberId);
  }

  /**
   * Update existing member with new data (only if local data is missing)
   */
  protected async updateExistingMember(existingMember: Member, updates: Partial<Member>): Promise<Member> {
    const updateData: Partial<Member> = {};

    // Only update if external source has data and local data is missing or empty
    if (updates.first_name && !existingMember.first_name) {
      updateData.first_name = updates.first_name;
    }
    if (updates.last_name && !existingMember.last_name) {
      updateData.last_name = updates.last_name;
    }

    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString();

      const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updateData);

      const stmt = prepare(`UPDATE members SET ${setClause} WHERE id = ?`);
      stmt.run(...values, existingMember.id);
    }

    return prepare('SELECT * FROM members WHERE id = ?').get(existingMember.id) as Member;
  }

  /**
   * Create or update external integration record
   */
  protected async upsertExternalIntegration(
    memberId: number, 
    systemName: string, 
    externalId: string, 
    externalData: any,
    flags: number = 1 // Active by default
  ): Promise<void> {
    const stmt = prepare(`
      INSERT OR REPLACE INTO external_integrations 
      (member_id, system_name, external_id, external_data_json, last_synced_at, flags)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      memberId,
      systemName,
      externalId,
      JSON.stringify(externalData),
      new Date().toISOString(),
      flags
    );
  }

  /**
   * Deactivate external integration (set flags to inactive)
   */
  protected async deactivateExternalIntegration(memberId: number, systemName: string): Promise<void> {
    const stmt = prepare(`
      UPDATE external_integrations 
      SET flags = flags & ~1, last_synced_at = ?
      WHERE member_id = ? AND system_name = ?
    `);

    stmt.run(new Date().toISOString(), memberId, systemName);
  }

  /**
   * Find member by external integration
   */
  protected async findMemberByExternalId(systemName: string, externalId: string): Promise<Member | null> {
    const stmt = prepare(`
      SELECT m.* FROM members m
      JOIN external_integrations ei ON m.id = ei.member_id
      WHERE ei.system_name = ? AND ei.external_id = ? AND ei.flags & 1 = 1
    `);
    const member = stmt.get(systemName, externalId) as Member | undefined;
    return member || null;
  }

  /**
   * HMAC signature verification (common pattern for webhooks)
   */
  protected verifyHMACSignature(payload: string, signature: string, secret: string, algorithm: string = 'sha256'): boolean {
    if (!secret) return false;

    const expectedSignature = crypto
      .createHmac(algorithm, secret)
      .update(payload)
      .digest('hex');

    // Handle different signature formats
    const cleanSignature = signature.replace(/^(sha256=|sha1=)/, '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(cleanSignature)
    );
  }

  /**
   * MD5 signature verification (for Patreon)
   */
  protected verifyMD5Signature(payload: string, signature: string, secret: string): boolean {
    if (!secret) return false;

    const expectedSignature = crypto
      .createHmac('md5', secret)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Create a new member with default values
   */
  protected async createBaseMember(memberData: {
    first_name: string;
    last_name: string;
    email: string;
    flags?: number;
    date_added?: string;
  }): Promise<Member> {
    const data = {
      first_name: memberData.first_name,
      last_name: memberData.last_name,
      email: memberData.email,
      flags: memberData.flags || 1, // Active by default
      date_added: memberData.date_added || new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const stmt = prepare(`
      INSERT INTO members (first_name, last_name, email, flags, date_added, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.first_name,
      data.last_name,
      data.email,
      data.flags,
      data.date_added,
      data.created_at,
      data.updated_at
    );

    return prepare('SELECT * FROM members WHERE id = ?').get(result.lastInsertRowid) as Member;
  }

  /**
   * Validate email format
   */
  protected isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Generate a placeholder email when external service doesn't provide one
   */
  protected generatePlaceholderEmail(systemName: string, externalId: string): string {
    return `${systemName}_${externalId}@placeholder.local`;
  }

  /**
   * Abstract methods that must be implemented by concrete sync services
   */
  abstract bulkSync(...args: any[]): Promise<{ synced: number; errors: number }>;
}
