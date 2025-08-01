import { getDb } from './DatabaseService';
import { AppError } from '../middleware/errorHandler';
import type { Events, EventsMarketing, EventsVolunteers, EventsAttendance, EventsEventbriteLink, EventbriteEvents } from '../types/database';
import type { EventWithDetails, CreateEventPayload, CreateEventMarketingPayload, CreateVolunteerPayload, CreateAttendancePayload } from '../types/events';
import { sql } from 'kysely';

export class EventService {
  private db = getDb();

  public async getEvents(options: {
    page: number;
    limit: number;
    upcoming?: boolean;
  }): Promise<{ events: Events[]; pagination: any }> {
    const { page, limit, upcoming } = options;
    const offset = (page - 1) * limit;

    let query = this.db
      .selectFrom('events')
      .selectAll()
      .where('flags', '&', 1); // Only active events

    if (upcoming) {
      query = query.where('start_datetime', '>', sql`datetime('now')`);
    }

    const countQuery = query
      .clearSelect()
      .select(sql`COUNT(*)`.as('total'));

    const [countResult, events] = await Promise.all([
      countQuery.executeTakeFirst() as Promise<{ total: number }>,
      query
        .orderBy('start_datetime', 'asc')
        .limit(limit)
        .offset(offset)
        .execute()
    ]);

    const total = countResult?.total || 0;
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

  public async getEventById(id: number): Promise<Events> {
    const event = await this.db
      .selectFrom('events')
      .selectAll()
      .where('id', '=', id)
      .where('flags', '&', 1) // Only active events
      .executeTakeFirst();

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    return event;
  }

  public async getEventWithDetails(id: number): Promise<EventWithDetails> {
    const event = await this.getEventById(id);

    const [eventbriteEvent, marketing, volunteers, attendance, eventbriteLink] = await Promise.all([
      this.getEventbriteEventByEventId(id),
      this.getEventMarketing(id),
      this.getEventVolunteers(id),
      this.getEventAttendance(id),
      this.getEventbriteLink(id)
    ]);

    return {
      event,
      eventbrite_event: eventbriteEvent || undefined,
      marketing: marketing || undefined,
      volunteers,
      attendance,
      eventbrite_link: eventbriteLink || undefined
    };
  }

  public async createEvent(data: CreateEventPayload): Promise<Events> {
    const flags = data.flags || 3; // Default: active + public

    const result = await this.db
      .insertInto('events')
      .values({
        name: data.name,
        description: data.description || null,
        start_datetime: data.start_datetime,
        end_datetime: data.end_datetime,
        flags,
        max_capacity: data.max_capacity || null,
        required_membership_types: data.required_membership_types ? JSON.stringify(data.required_membership_types) : null,
        eventbrite_id: data.eventbrite_id || null,
        eventbrite_url: data.eventbrite_url || null
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    return this.getEventById(result.id!);
  }

  // Events Marketing methods
  public async getEventMarketing(eventId: number): Promise<EventsMarketing | null> {
    return await this.db
      .selectFrom('events_marketing')
      .selectAll()
      .where('event_id', '=', eventId)
      .where('flags', '&', 1) // Only active
      .executeTakeFirst() || null;
  }

  public async createEventMarketing(data: CreateEventMarketingPayload): Promise<EventsMarketing> {
    await this.getEventById(data.event_id); // Ensure event exists

    const result = await this.db
      .insertInto('events_marketing')
      .values({
        event_id: data.event_id,
        primary_marketing_copy: data.primary_marketing_copy || null,
        secondary_marketing_copy: data.secondary_marketing_copy || null,
        blurb: data.blurb || null,
        social_media_copy: data.social_media_copy || null,
        email_subject: data.email_subject || null,
        email_preview_text: data.email_preview_text || null,
        seo_title: data.seo_title || null,
        seo_description: data.seo_description || null,
        hashtags: data.hashtags ? JSON.stringify(data.hashtags) : null,
        marketing_images_json: data.marketing_images ? JSON.stringify(data.marketing_images) : null,
        key_selling_points: data.key_selling_points ? JSON.stringify(data.key_selling_points) : null,
        flags: 1 // Active
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    return await this.db
      .selectFrom('events_marketing')
      .selectAll()
      .where('id', '=', result.id!)
      .executeTakeFirstOrThrow();
  }

  // Events Volunteers methods
  public async getEventVolunteers(eventId: number): Promise<EventsVolunteers[]> {
    return await this.db
      .selectFrom('events_volunteers')
      .selectAll()
      .where('event_id', '=', eventId)
      .where('flags', '&', 1) // Only active
      .orderBy('role', 'asc')
      .execute();
  }

  public async createVolunteer(data: CreateVolunteerPayload): Promise<EventsVolunteers> {
    await this.getEventById(data.event_id); // Ensure event exists

    const result = await this.db
      .insertInto('events_volunteers')
      .values({
        event_id: data.event_id,
        member_id: data.member_id,
        role: data.role,
        contact_phone: data.contact_phone || null,
        contact_email: data.contact_email || null,
        arrival_time: data.arrival_time || null,
        departure_time: data.departure_time || null,
        special_instructions: data.special_instructions || null,
        equipment_needed: data.equipment_needed ? JSON.stringify(data.equipment_needed) : null,
        skills_required: data.skills_required ? JSON.stringify(data.skills_required) : null,
        volunteer_notes: data.volunteer_notes || null,
        flags: 1 // Active
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    return await this.db
      .selectFrom('events_volunteers')
      .selectAll()
      .where('id', '=', result.id!)
      .executeTakeFirstOrThrow();
  }

  // Events Attendance methods
  public async getEventAttendance(eventId: number): Promise<EventsAttendance[]> {
    return await this.db
      .selectFrom('events_attendance')
      .selectAll()
      .where('event_id', '=', eventId)
      .where('flags', '&', 1) // Only active
      .orderBy('created_at', 'desc')
      .execute();
  }

  public async createAttendance(data: CreateAttendancePayload): Promise<EventsAttendance> {
    await this.getEventById(data.event_id); // Ensure event exists

    // Check if already exists
    let existingQuery = this.db
      .selectFrom('events_attendance')
      .select('id')
      .where('event_id', '=', data.event_id);

    if (data.member_id) {
      existingQuery = existingQuery.where('member_id', '=', data.member_id);
    } else if (data.eventbrite_attendee_id) {
      existingQuery = existingQuery.where('eventbrite_attendee_id', '=', data.eventbrite_attendee_id);
    }

    const existing = await existingQuery.executeTakeFirst();
    if (existing) {
      throw new AppError('Attendance record already exists', 409);
    }

    const result = await this.db
      .insertInto('events_attendance')
      .values({
        event_id: data.event_id,
        member_id: data.member_id || null,
        eventbrite_attendee_id: data.eventbrite_attendee_id || null,
        eventbrite_order_id: data.eventbrite_order_id || null,
        ticket_type: data.ticket_type || null,
        registration_date: data.registration_date || null,
        attendance_source: data.attendance_source || 1, // Default to manual
        check_in_method: data.check_in_method || null,
        marketing_source: data.marketing_source || null,
        notes: data.notes || null,
        flags: 1 // Active
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    return await this.db
      .selectFrom('events_attendance')
      .selectAll()
      .where('id', '=', result.id!)
      .executeTakeFirstOrThrow();
  }

  public async checkInAttendee(attendanceId: number, checkInMethod?: string): Promise<EventsAttendance> {
    const result = await this.db
      .updateTable('events_attendance')
      .set({
        checked_in_at: sql`datetime('now')`,
        check_in_method: checkInMethod || 'manual',
        updated_at: sql`datetime('now')`
      })
      .where('id', '=', attendanceId)
      .where('flags', '&', 1)
      .returning('id')
      .executeTakeFirst();

    if (!result) {
      throw new AppError('Attendance record not found', 404);
    }

    return await this.db
      .selectFrom('events_attendance')
      .selectAll()
      .where('id', '=', result.id!)
      .executeTakeFirstOrThrow();
  }

  // Eventbrite integration methods
  private async getEventbriteEventByEventId(eventId: number): Promise<EventbriteEvents | null> {
    const link = await this.db
      .selectFrom('events_eventbrite_link')
      .select('eventbrite_event_id')
      .where('event_id', '=', eventId)
      .where('flags', '&', 1) // Only active links
      .executeTakeFirst();

    if (!link) return null;

    return await this.db
      .selectFrom('eventbrite_events')
      .selectAll()
      .where('id', '=', link.eventbrite_event_id)
      .where('flags', '&', 1) // Only active
      .executeTakeFirst() || null;
  }

  private async getEventbriteLink(eventId: number): Promise<EventsEventbriteLink | null> {
    return await this.db
      .selectFrom('events_eventbrite_link')
      .selectAll()
      .where('event_id', '=', eventId)
      .where('flags', '&', 1) // Only active links
      .executeTakeFirst() || null;
  }
}
