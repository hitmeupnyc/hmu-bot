import axios, { AxiosInstance } from 'axios';
import { DatabaseService } from './DatabaseService';
import { Member, SyncOperation, ExternalIntegration, Event } from '../types';

export interface EventbriteAttendee {
  id: string;
  created: string;
  changed: string;
  ticket_class_id: string;
  event_id: string;
  order_id: string;
  profile: {
    first_name: string;
    last_name: string;
    email: string;
    name: string;
    addresses?: {
      home?: {
        city?: string;
        country?: string;
        region?: string;
      };
    };
  };
  barcodes?: Array<{
    barcode: string;
    status: string;
  }>;
  checked_in: boolean;
  cancelled: boolean;
  refunded: boolean;
  status: string;
}

export interface EventbriteEvent {
  id: string;
  name: {
    text: string;
  };
  description: {
    text: string;
  };
  start: {
    timezone: string;
    local: string;
    utc: string;
  };
  end: {
    timezone: string;
    local: string;
    utc: string;
  };
  url: string;
  capacity?: number;
  status: string;
  created: string;
  changed: string;
  published: string;
  organizer_id: string;
}

export interface EventbriteWebhookPayload {
  api_url: string;
  config: {
    action: string;
    user_id: string;
    endpoint_url: string;
    webhook_id: string;
  };
}

export class EventbriteSyncService {
  private client: AxiosInstance;
  private db: DatabaseService;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://www.eventbriteapi.com/v3',
      headers: {
        'Authorization': `Bearer ${process.env.EVENTBRITE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    this.db = DatabaseService.getInstance();
  }

  /**
   * Handle incoming Eventbrite webhook
   */
  async handleWebhook(payload: EventbriteWebhookPayload): Promise<void> {
    const { action } = payload.config;
    const { api_url } = payload;

    const syncOperation = await this.createSyncOperation({
      platform: 'eventbrite',
      operation_type: 'webhook',
      external_id: this.extractIdFromUrl(api_url),
      status: 'pending',
      payload_json: JSON.stringify(payload)
    });

    try {
      switch (action) {
        case 'order.placed':
        case 'order.updated':
          await this.processOrder(api_url, syncOperation.id);
          break;
        case 'attendee.updated':
        case 'attendee.checked_in':
        case 'attendee.checked_out':
          await this.processAttendee(api_url, syncOperation.id);
          break;
        case 'event.published':
        case 'event.updated':
          await this.processEvent(api_url, syncOperation.id);
          break;
        default:
          await this.updateSyncOperation(syncOperation.id, 'success', 'Webhook received but no action needed');
      }
    } catch (error) {
      await this.updateSyncOperation(
        syncOperation.id,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  /**
   * Process an Eventbrite order and sync attendees
   */
  async processOrder(orderUrl: string, syncOperationId: number): Promise<void> {
    try {
      const response = await this.client.get(orderUrl.replace('https://www.eventbriteapi.com/v3', ''));
      const order = response.data;

      // Get attendees for this order
      const attendeesResponse = await this.client.get(`/orders/${order.id}/attendees/`);
      const attendees: EventbriteAttendee[] = attendeesResponse.data.attendees;

      for (const attendee of attendees) {
        await this.syncAttendee(attendee, order.event_id);
      }

      await this.updateSyncOperation(syncOperationId, 'success', `Processed order with ${attendees.length} attendees`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Process a single Eventbrite attendee
   */
  async processAttendee(attendeeUrl: string, syncOperationId: number): Promise<void> {
    try {
      const response = await this.client.get(attendeeUrl.replace('https://www.eventbriteapi.com/v3', ''));
      const attendee: EventbriteAttendee = response.data;

      await this.syncAttendee(attendee, attendee.event_id);
      await this.updateSyncOperation(syncOperationId, 'success', 'Attendee processed');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Process an Eventbrite event
   */
  async processEvent(eventUrl: string, syncOperationId: number): Promise<void> {
    try {
      const response = await this.client.get(eventUrl.replace('https://www.eventbriteapi.com/v3', ''));
      const eventData: EventbriteEvent = response.data;

      await this.syncEvent(eventData);
      await this.updateSyncOperation(syncOperationId, 'success', 'Event processed');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Sync an Eventbrite attendee to our member database
   */
  async syncAttendee(attendee: EventbriteAttendee, eventId: string): Promise<Member | null> {
    if (!attendee.profile.email) {
      return null;
    }

    // Check if member exists by email
    const existingMember = await this.findMemberByEmail(attendee.profile.email);
    let member: Member;

    if (existingMember) {
      member = await this.updateExistingMember(existingMember, attendee);
    } else {
      member = await this.createMemberFromAttendee(attendee);
    }

    // Update external integration
    await this.upsertExternalIntegration(member.id, attendee);

    // Record event attendance if we have the event in our system
    const localEvent = await this.findEventByEventbriteId(eventId);
    if (localEvent) {
      await this.recordEventAttendance(member.id, localEvent.id, attendee);
    }

    return member;
  }

  /**
   * Sync an Eventbrite event to our events database
   */
  async syncEvent(eventData: EventbriteEvent): Promise<Event | null> {
    // Check if event exists by Eventbrite ID
    const existingEvent = await this.findEventByEventbriteId(eventData.id);

    if (existingEvent) {
      return await this.updateExistingEvent(existingEvent, eventData);
    } else {
      return await this.createEventFromEventbrite(eventData);
    }
  }

  /**
   * Bulk sync all events from Eventbrite
   */
  async bulkSyncEvents(organizerId?: string): Promise<{ synced: number; errors: number }> {
    let synced = 0;
    let errors = 0;
    let page = 1;
    let hasMore = true;

    try {
      while (hasMore) {
        const params: any = {
          'expand': 'ticket_availability',
          'status': 'live,started,ended',
          'page': page,
        };

        if (organizerId) {
          params['organizer.id'] = organizerId;
        }

        const response = await this.client.get('/events/', { params });
        const events: EventbriteEvent[] = response.data.events;

        for (const event of events) {
          const syncOperation = await this.createSyncOperation({
            platform: 'eventbrite',
            operation_type: 'bulk_sync',
            external_id: event.id,
            status: 'pending',
            payload_json: JSON.stringify(event)
          });

          try {
            await this.syncEvent(event);
            await this.updateSyncOperation(syncOperation.id, 'success', 'Event synced');
            synced++;
          } catch (error) {
            await this.updateSyncOperation(syncOperation.id, 'failed', error instanceof Error ? error.message : 'Unknown error');
            errors++;
          }
        }

        hasMore = response.data.pagination.has_more_items;
        page++;
      }

      return { synced, errors };
    } catch (error) {
      console.error('Eventbrite bulk sync error:', error);
      throw error;
    }
  }

  /**
   * Bulk sync attendees for a specific event
   */
  async bulkSyncAttendees(eventId: string): Promise<{ synced: number; errors: number }> {
    let synced = 0;
    let errors = 0;
    let page = 1;
    let hasMore = true;

    try {
      while (hasMore) {
        const response = await this.client.get(`/events/${eventId}/attendees/`, {
          params: { page }
        });
        const attendees: EventbriteAttendee[] = response.data.attendees;

        for (const attendee of attendees) {
          const syncOperation = await this.createSyncOperation({
            platform: 'eventbrite',
            operation_type: 'bulk_sync',
            external_id: attendee.id,
            status: 'pending',
            payload_json: JSON.stringify(attendee)
          });

          try {
            await this.syncAttendee(attendee, eventId);
            await this.updateSyncOperation(syncOperation.id, 'success', 'Attendee synced');
            synced++;
          } catch (error) {
            await this.updateSyncOperation(syncOperation.id, 'failed', error instanceof Error ? error.message : 'Unknown error');
            errors++;
          }
        }

        hasMore = response.data.pagination.has_more_items;
        page++;
      }

      return { synced, errors };
    } catch (error) {
      console.error('Eventbrite attendees bulk sync error:', error);
      throw error;
    }
  }

  // Private helper methods
  private async findMemberByEmail(email: string): Promise<Member | null> {
    const stmt = this.db.db.prepare('SELECT * FROM members WHERE email = ?');
    const member = stmt.get(email) as Member | undefined;
    return member || null;
  }

  private async findEventByEventbriteId(eventbriteId: string): Promise<Event | null> {
    const stmt = this.db.db.prepare('SELECT * FROM events WHERE eventbrite_id = ?');
    const event = stmt.get(eventbriteId) as Event | undefined;
    return event || null;
  }

  private async updateExistingMember(existingMember: Member, attendee: EventbriteAttendee): Promise<Member> {
    const updateData: Partial<Member> = {};

    // Only update if Eventbrite has data and local data is missing
    if (attendee.profile.first_name && !existingMember.first_name) {
      updateData.first_name = attendee.profile.first_name;
    }
    if (attendee.profile.last_name && !existingMember.last_name) {
      updateData.last_name = attendee.profile.last_name;
    }

    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString();

      const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updateData);

      const stmt = this.db.db.prepare(`UPDATE members SET ${setClause} WHERE id = ?`);
      stmt.run(...values, existingMember.id);
    }

    // Return updated member
    const stmt = this.db.db.prepare('SELECT * FROM members WHERE id = ?');
    return stmt.get(existingMember.id) as Member;
  }

  private async createMemberFromAttendee(attendee: EventbriteAttendee): Promise<Member> {
    const memberData = {
      first_name: attendee.profile.first_name || 'Unknown',
      last_name: attendee.profile.last_name || 'User',
      email: attendee.profile.email,
      flags: 1, // Active by default
      date_added: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const stmt = this.db.db.prepare(`
      INSERT INTO members (first_name, last_name, email, flags, date_added, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      memberData.first_name,
      memberData.last_name,
      memberData.email,
      memberData.flags,
      memberData.date_added,
      memberData.created_at,
      memberData.updated_at
    );

    return this.db.db.prepare('SELECT * FROM members WHERE id = ?').get(result.lastInsertRowid) as Member;
  }

  private async createEventFromEventbrite(eventData: EventbriteEvent): Promise<Event> {
    const eventRecord = {
      name: eventData.name.text,
      description: eventData.description?.text || null,
      start_datetime: eventData.start.utc,
      end_datetime: eventData.end.utc,
      flags: 3, // Active and public by default
      eventbrite_id: eventData.id,
      eventbrite_url: eventData.url,
      max_capacity: eventData.capacity || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const stmt = this.db.db.prepare(`
      INSERT INTO events (name, description, start_datetime, end_datetime, flags, eventbrite_id, eventbrite_url, max_capacity, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      eventRecord.name,
      eventRecord.description,
      eventRecord.start_datetime,
      eventRecord.end_datetime,
      eventRecord.flags,
      eventRecord.eventbrite_id,
      eventRecord.eventbrite_url,
      eventRecord.max_capacity,
      eventRecord.created_at,
      eventRecord.updated_at
    );

    return this.db.db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid) as Event;
  }

  private async updateExistingEvent(existingEvent: Event, eventData: EventbriteEvent): Promise<Event> {
    const updateData: Partial<Event> = {
      name: eventData.name.text,
      description: eventData.description?.text || null,
      start_datetime: eventData.start.utc,
      end_datetime: eventData.end.utc,
      eventbrite_url: eventData.url,
      max_capacity: eventData.capacity || null,
      updated_at: new Date().toISOString()
    };

    const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);

    const stmt = this.db.db.prepare(`UPDATE events SET ${setClause} WHERE id = ?`);
    stmt.run(...values, existingEvent.id);

    return this.db.db.prepare('SELECT * FROM events WHERE id = ?').get(existingEvent.id) as Event;
  }

  private async recordEventAttendance(memberId: number, eventId: number, attendee: EventbriteAttendee): Promise<void> {
    const stmt = this.db.db.prepare(`
      INSERT OR REPLACE INTO event_attendance (event_id, member_id, checked_in_at, attendance_source, notes)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      eventId,
      memberId,
      attendee.checked_in ? new Date().toISOString() : null,
      'eventbrite',
      `Eventbrite attendee ID: ${attendee.id}, Status: ${attendee.status}`
    );
  }

  private async upsertExternalIntegration(memberId: number, attendee: EventbriteAttendee): Promise<void> {
    const stmt = this.db.db.prepare(`
      INSERT OR REPLACE INTO external_integrations 
      (member_id, system_name, external_id, external_data_json, last_synced_at, flags)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      memberId,
      'eventbrite',
      attendee.id,
      JSON.stringify(attendee),
      new Date().toISOString(),
      1 // Active
    );
  }

  private async createSyncOperation(data: Omit<SyncOperation, 'id' | 'created_at'>): Promise<SyncOperation> {
    const stmt = this.db.db.prepare(`
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

    return this.db.db.prepare('SELECT * FROM sync_operations WHERE id = ?').get(result.lastInsertRowid) as SyncOperation;
  }

  private async updateSyncOperation(id: number, status: string, message?: string, memberId?: number): Promise<void> {
    const stmt = this.db.db.prepare(`
      UPDATE sync_operations 
      SET status = ?, error_message = ?, member_id = ?, processed_at = ?
      WHERE id = ?
    `);

    stmt.run(status, message || null, memberId || null, new Date().toISOString(), id);
  }

  private extractIdFromUrl(url: string): string | undefined {
    const match = url.match(/\/(\d+)\/?$/);
    return match ? match[1] : undefined;
  }
}