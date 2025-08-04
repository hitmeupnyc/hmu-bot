import { prepare } from './DatabaseService';
import { AuditService } from './AuditService';
import { AppError } from '../middleware/errorHandler';
import { 
  Member, 
  CreateMemberRequest, 
  UpdateMemberRequest, 
  MemberMembership, 
  MemberFlags
} from '../types';

export class MemberService {
  private auditService = AuditService.getInstance();

  public async getMembers(options: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<{ members: Member[]; pagination: any }> {
    const { page, limit, search } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE (flags & 1) = 1'; // Only active members
    const params: any[] = [limit, offset];

    if (search) {
      whereClause += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.unshift(searchTerm, searchTerm, searchTerm);
    }

    const countQuery = `SELECT COUNT(*) as total FROM members ${whereClause}`;
    const selectQuery = `
      SELECT * FROM members 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;

    const countResult = prepare(countQuery).get(search ? [search, search, search] : []) as { total: number };
    const members = prepare(selectQuery).all(params) as Member[];

    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    return {
      members,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  private async getMemberByIdInternal(id: number): Promise<Member> {
    const member = prepare(
      'SELECT * FROM members WHERE id = ? AND (flags & 1) = 1'
    ).get(id) as Member | undefined;

    if (!member) {
      throw new AppError('Member not found', 404);
    }

    return member;
  }

  public async getMemberById(id: number, auditInfo?: { sessionId: string; userIp: string }): Promise<Member> {
    const member = await this.getMemberByIdInternal(id);

    // Log member view event
    if (auditInfo) {
      await this.auditService.logMemberView(
        id,
        auditInfo.sessionId,
        auditInfo.userIp
      );
    }

    return member;
  }

  public async createMember(data: CreateMemberRequest): Promise<Member> {
    // Check if email already exists
    const existingMember = prepare(
      'SELECT id FROM members WHERE email = ?'
    ).get(data.email);

    if (existingMember) {
      throw new AppError('Member with this email already exists', 409);
    }

    const flags = this.buildMemberFlags({
      active: true,
      professional_affiliate: data.is_professional_affiliate || false
    });

    const stmt = prepare(`
      INSERT INTO members (
        first_name, last_name, preferred_name, email, pronouns, 
        sponsor_notes, flags
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.first_name,
      data.last_name,
      data.preferred_name || null,
      data.email,
      data.pronouns || null,
      data.sponsor_notes || null,
      flags
    );

    return this.getMemberByIdInternal(result.lastInsertRowid as number);
  }

  public async updateMember(data: UpdateMemberRequest, auditInfo?: { sessionId: string; userIp: string }): Promise<Member> {
    const existingMember = await this.getMemberByIdInternal(data.id);

    // Check if email is being changed and if it conflicts
    if (data.email && data.email !== existingMember.email) {
      const emailConflict = prepare(
        'SELECT id FROM members WHERE email = ? AND id != ?'
      ).get(data.email, data.id);

      if (emailConflict) {
        throw new AppError('Member with this email already exists', 409);
      }
    }

    const updateFields: string[] = [];
    const values: any[] = [];

    if (data.first_name !== undefined) {
      updateFields.push('first_name = ?');
      values.push(data.first_name);
    }
    if (data.last_name !== undefined) {
      updateFields.push('last_name = ?');
      values.push(data.last_name);
    }
    if (data.preferred_name !== undefined) {
      updateFields.push('preferred_name = ?');
      values.push(data.preferred_name);
    }
    if (data.email !== undefined) {
      updateFields.push('email = ?');
      values.push(data.email);
    }
    if (data.pronouns !== undefined) {
      updateFields.push('pronouns = ?');
      values.push(data.pronouns);
    }
    if (data.sponsor_notes !== undefined) {
      updateFields.push('sponsor_notes = ?');
      values.push(data.sponsor_notes);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(data.id);

    const stmt = prepare(`
      UPDATE members 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    // Get the updated member data (without logging another view event)
    const updatedMember = await this.getMemberByIdInternal(data.id);

    // Log member update event
    if (auditInfo) {
      await this.auditService.logMemberUpdate(
        data.id,
        existingMember,
        updatedMember,
        auditInfo.sessionId,
        auditInfo.userIp
      );
    }

    return updatedMember;
  }

  public async deleteMember(id: number): Promise<void> {
    const member = await this.getMemberByIdInternal(id);

    // Soft delete by setting active flag to false
    const flags = member.flags & ~1; // Clear active bit

    prepare(
      'UPDATE members SET flags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(flags, id);
  }

  public async getMemberMemberships(memberId: number): Promise<MemberMembership[]> {
    await this.getMemberByIdInternal(memberId); // Ensure member exists

    return prepare(`
      SELECT mm.*, mt.name as membership_name, ps.name as payment_status_name
      FROM member_memberships mm
      JOIN membership_types mt ON mm.membership_type_id = mt.id
      LEFT JOIN payment_statuses ps ON mm.payment_status_id = ps.id
      WHERE mm.member_id = ?
      ORDER BY mm.start_date DESC
    `).all(memberId) as MemberMembership[];
  }

  public async getMemberEvents(memberId: number): Promise<any[]> {
    await this.getMemberByIdInternal(memberId); // Ensure member exists

    return prepare(`
      SELECT e.*, ea.checked_in_at, ea.checked_out_at, ea.attendance_source
      FROM events e
      JOIN event_attendance ea ON e.id = ea.event_id
      WHERE ea.member_id = ?
      ORDER BY e.start_datetime DESC
    `).all(memberId);
  }

  private buildMemberFlags(flags: MemberFlags): number {
    let result = 0;
    if (flags.active) result |= 1;
    if (flags.professional_affiliate) result |= 2;
    return result;
  }
}
