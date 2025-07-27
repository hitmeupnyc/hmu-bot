"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventService = void 0;
const DatabaseService_1 = require("./DatabaseService");
const errorHandler_1 = require("../middleware/errorHandler");
class EventService {
    db = DatabaseService_1.DatabaseService.getInstance().getDatabase();
    async getEvents(options) {
        const { page, limit, upcoming } = options;
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE (flags & 1) = 1';
        const params = [limit, offset];
        if (upcoming) {
            whereClause += ' AND start_datetime > datetime("now")';
        }
        const countQuery = `SELECT COUNT(*) as total FROM events ${whereClause}`;
        const selectQuery = `
      SELECT * FROM events 
      ${whereClause}
      ORDER BY start_datetime ASC 
      LIMIT ? OFFSET ?
    `;
        const countResult = this.db.prepare(countQuery).get();
        const events = this.db.prepare(selectQuery).all(params);
        const total = countResult.total;
        const totalPages = Math.ceil(total / limit);
        return {
            events,
            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        };
    }
    async getEventById(id) {
        const event = this.db.prepare('SELECT * FROM events WHERE id = ? AND (flags & 1) = 1').get(id);
        if (!event) {
            throw new errorHandler_1.AppError('Event not found', 404);
        }
        return event;
    }
    async createEvent(data) {
        const flags = this.buildEventFlags({
            active: true,
            public: data.is_public !== false
        });
        const stmt = this.db.prepare(`
      INSERT INTO events (
        name, description, start_datetime, end_datetime, flags, 
        max_capacity, required_membership_types
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        const result = stmt.run(data.name, data.description || null, data.start_datetime, data.end_datetime, flags, data.max_capacity || null, data.required_membership_types ? JSON.stringify(data.required_membership_types) : null);
        return this.getEventById(result.lastInsertRowid);
    }
    async getEventAttendance(eventId) {
        await this.getEventById(eventId);
        return this.db.prepare(`
      SELECT ea.*, m.first_name, m.last_name, m.email
      FROM event_attendance ea
      JOIN members m ON ea.member_id = m.id
      WHERE ea.event_id = ?
      ORDER BY ea.checked_in_at DESC
    `).all(eventId);
    }
    async checkInMember(eventId, memberId) {
        await this.getEventById(eventId);
        const member = this.db.prepare('SELECT id FROM members WHERE id = ? AND (flags & 1) = 1').get(memberId);
        if (!member) {
            throw new errorHandler_1.AppError('Member not found', 404);
        }
        const existingAttendance = this.db.prepare('SELECT id FROM event_attendance WHERE event_id = ? AND member_id = ?').get(eventId, memberId);
        if (existingAttendance) {
            throw new errorHandler_1.AppError('Member already checked in to this event', 409);
        }
        const stmt = this.db.prepare(`
      INSERT INTO event_attendance (event_id, member_id, checked_in_at, attendance_source)
      VALUES (?, ?, datetime('now'), 'manual')
    `);
        const result = stmt.run(eventId, memberId);
        return this.db.prepare('SELECT * FROM event_attendance WHERE id = ?').get(result.lastInsertRowid);
    }
    buildEventFlags(flags) {
        let result = 0;
        if (flags.active)
            result |= 1;
        if (flags.public)
            result |= 2;
        return result;
    }
}
exports.EventService = EventService;
//# sourceMappingURL=EventService.js.map