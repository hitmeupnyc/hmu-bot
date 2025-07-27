"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemberService = void 0;
const DatabaseService_1 = require("./DatabaseService");
const errorHandler_1 = require("../middleware/errorHandler");
class MemberService {
    db = DatabaseService_1.DatabaseService.getInstance().getDatabase();
    async getMembers(options) {
        const { page, limit, search } = options;
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE (flags & 1) = 1';
        const params = [limit, offset];
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
        const countResult = this.db.prepare(countQuery).get(search ? [search, search, search] : []);
        const members = this.db.prepare(selectQuery).all(params);
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
    async getMemberById(id) {
        const member = this.db.prepare('SELECT * FROM members WHERE id = ? AND (flags & 1) = 1').get(id);
        if (!member) {
            throw new errorHandler_1.AppError('Member not found', 404);
        }
        return member;
    }
    async createMember(data) {
        const existingMember = this.db.prepare('SELECT id FROM members WHERE email = ?').get(data.email);
        if (existingMember) {
            throw new errorHandler_1.AppError('Member with this email already exists', 409);
        }
        const flags = this.buildMemberFlags({
            active: true,
            professional_affiliate: data.is_professional_affiliate || false
        });
        const stmt = this.db.prepare(`
      INSERT INTO members (
        first_name, last_name, preferred_name, email, pronouns, 
        sponsor_notes, flags
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        const result = stmt.run(data.first_name, data.last_name, data.preferred_name || null, data.email, data.pronouns || null, data.sponsor_notes || null, flags);
        return this.getMemberById(result.lastInsertRowid);
    }
    async updateMember(data) {
        const existingMember = await this.getMemberById(data.id);
        if (data.email && data.email !== existingMember.email) {
            const emailConflict = this.db.prepare('SELECT id FROM members WHERE email = ? AND id != ?').get(data.email, data.id);
            if (emailConflict) {
                throw new errorHandler_1.AppError('Member with this email already exists', 409);
            }
        }
        const updateFields = [];
        const values = [];
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
        const stmt = this.db.prepare(`
      UPDATE members 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);
        stmt.run(...values);
        return this.getMemberById(data.id);
    }
    async deleteMember(id) {
        const member = await this.getMemberById(id);
        const flags = member.flags & ~1;
        this.db.prepare('UPDATE members SET flags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(flags, id);
    }
    async getMemberMemberships(memberId) {
        await this.getMemberById(memberId);
        return this.db.prepare(`
      SELECT mm.*, mt.name as membership_name, ps.name as payment_status_name
      FROM member_memberships mm
      JOIN membership_types mt ON mm.membership_type_id = mt.id
      LEFT JOIN payment_statuses ps ON mm.payment_status_id = ps.id
      WHERE mm.member_id = ?
      ORDER BY mm.start_date DESC
    `).all(memberId);
    }
    async getMemberEvents(memberId) {
        await this.getMemberById(memberId);
        return this.db.prepare(`
      SELECT e.*, ea.checked_in_at, ea.checked_out_at, ea.attendance_source
      FROM events e
      JOIN event_attendance ea ON e.id = ea.event_id
      WHERE ea.member_id = ?
      ORDER BY e.start_datetime DESC
    `).all(memberId);
    }
    buildMemberFlags(flags) {
        let result = 0;
        if (flags.active)
            result |= 1;
        if (flags.professional_affiliate)
            result |= 2;
        return result;
    }
}
exports.MemberService = MemberService;
//# sourceMappingURL=MemberService.js.map