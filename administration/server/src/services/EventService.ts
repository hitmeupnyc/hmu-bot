import { DatabaseService } from './DatabaseService';
import { AppError } from '../middleware/errorHandler';
import { Event, CreateEventRequest, EventAttendance, EventFlags } from '../types';

export class EventService {
  private db = DatabaseService.getInstance().getDatabase();
  private dbService = DatabaseService.getInstance();

  public async getEvents(options: {
    page: number;
    limit: number;
    upcoming?: boolean;
  }): Promise<{ events: Event[]; pagination: any }> {
    const { page, limit, upcoming } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE (flags & 1) = 1'; // Only active events
    const params: any[] = [limit, offset];

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

    const countResult = this.dbService.prepare(countQuery).get() as { total: number };
    const events = this.dbService.prepare(selectQuery).all(params) as Event[];

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

  public async getEventById(id: number): Promise<Event> {
    const event = this.dbService.prepare(
      'SELECT * FROM events WHERE id = ? AND (flags & 1) = 1'
    ).get(id) as Event | undefined;

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    return event;
  }

  public async createEvent(data: CreateEventRequest): Promise<Event> {
    const flags = this.buildEventFlags({
      active: true,
      public: data.is_public !== false
    });

    const stmt = this.dbService.prepare(`
      INSERT INTO events (
        name, description, start_datetime, end_datetime, flags, 
        max_capacity, required_membership_types
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.name,
      data.description || null,
      data.start_datetime,
      data.end_datetime,
      flags,
      data.max_capacity || null,
      data.required_membership_types ? JSON.stringify(data.required_membership_types) : null
    );

    return this.getEventById(result.lastInsertRowid as number);
  }

  public async getEventAttendance(eventId: number): Promise<EventAttendance[]> {
    await this.getEventById(eventId); // Ensure event exists

    return this.dbService.prepare(`
      SELECT ea.*, m.first_name, m.last_name, m.email
      FROM event_attendance ea
      JOIN members m ON ea.member_id = m.id
      WHERE ea.event_id = ?
      ORDER BY ea.checked_in_at DESC
    `).all(eventId) as EventAttendance[];
  }

  public async checkInMember(eventId: number, memberId: number): Promise<EventAttendance> {
    await this.getEventById(eventId); // Ensure event exists
    
    // Check if member exists
    const member = this.dbService.prepare(
      'SELECT id FROM members WHERE id = ? AND (flags & 1) = 1'
    ).get(memberId);

    if (!member) {
      throw new AppError('Member not found', 404);
    }

    // Check if already checked in
    const existingAttendance = this.dbService.prepare(
      'SELECT id FROM event_attendance WHERE event_id = ? AND member_id = ?'
    ).get(eventId, memberId);

    if (existingAttendance) {
      throw new AppError('Member already checked in to this event', 409);
    }

    const stmt = this.dbService.prepare(`
      INSERT INTO event_attendance (event_id, member_id, checked_in_at, attendance_source)
      VALUES (?, ?, datetime('now'), 'manual')
    `);

    const result = stmt.run(eventId, memberId);

    return this.dbService.prepare(
      'SELECT * FROM event_attendance WHERE id = ?'
    ).get(result.lastInsertRowid) as EventAttendance;
  }

  private buildEventFlags(flags: EventFlags): number {
    let result = 0;
    if (flags.active) result |= 1;
    if (flags.public) result |= 2;
    return result;
  }
}
