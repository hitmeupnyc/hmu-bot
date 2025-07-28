import { 
  Event, 
  CreateEventRequest, 
  UpdateEventRequest, 
  ApiResponse, 
  PaginatedResponse,
  EventAttendance
} from '../types';

const API_BASE = '/api/events';

export class EventService {
  static async getEvents(options: {
    page?: number;
    limit?: number;
    upcoming?: boolean;
  } = {}): Promise<PaginatedResponse<Event>> {
    const params = new URLSearchParams();
    
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.upcoming) params.append('upcoming', 'true');

    const response = await fetch(`${API_BASE}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.statusText}`);
    }
    
    return response.json();
  }

  static async getEventById(id: number): Promise<ApiResponse<Event>> {
    const response = await fetch(`${API_BASE}/${id}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch event: ${response.statusText}`);
    }
    
    return response.json();
  }

  static async createEvent(eventData: CreateEventRequest): Promise<ApiResponse<Event>> {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create event: ${response.statusText}`);
    }
    
    return response.json();
  }

  static async updateEvent(eventData: UpdateEventRequest): Promise<ApiResponse<Event>> {
    const response = await fetch(`${API_BASE}/${eventData.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update event: ${response.statusText}`);
    }
    
    return response.json();
  }

  static async deleteEvent(id: number): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete event: ${response.statusText}`);
    }
    
    return response.json();
  }

  static async getEventAttendance(id: number): Promise<ApiResponse<EventAttendance[]>> {
    const response = await fetch(`${API_BASE}/${id}/attendance`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch event attendance: ${response.statusText}`);
    }
    
    return response.json();
  }

  static async checkInMember(eventId: number, memberId: number): Promise<ApiResponse<EventAttendance>> {
    const response = await fetch(`${API_BASE}/${eventId}/checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ member_id: memberId }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to check in member: ${response.statusText}`);
    }
    
    return response.json();
  }
}