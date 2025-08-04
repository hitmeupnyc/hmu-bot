import { 
  Event, 
  EventWithDetails,
  EventMarketing,
  EventVolunteer,
  EventAttendance,
  CreateEventRequest, 
  UpdateEventRequest,
  CreateEventMarketingRequest,
  CreateVolunteerRequest,
  CreateAttendanceRequest,
  ApiResponse, 
  PaginatedResponse
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

  static async getEventWithDetails(id: number): Promise<ApiResponse<EventWithDetails>> {
    const response = await fetch(`${API_BASE}/${id}/details`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch event details: ${response.statusText}`);
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

  // Marketing methods
  static async getEventMarketing(id: number): Promise<ApiResponse<EventMarketing>> {
    const response = await fetch(`${API_BASE}/${id}/marketing`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch event marketing: ${response.statusText}`);
    }
    
    return response.json();
  }

  static async createEventMarketing(eventId: number, marketingData: CreateEventMarketingRequest): Promise<ApiResponse<EventMarketing>> {
    const response = await fetch(`${API_BASE}/${eventId}/marketing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(marketingData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create event marketing: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Volunteer methods
  static async getEventVolunteers(id: number): Promise<ApiResponse<EventVolunteer[]>> {
    const response = await fetch(`${API_BASE}/${id}/volunteers`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch event volunteers: ${response.statusText}`);
    }
    
    return response.json();
  }

  static async addVolunteer(eventId: number, volunteerData: CreateVolunteerRequest): Promise<ApiResponse<EventVolunteer>> {
    const response = await fetch(`${API_BASE}/${eventId}/volunteers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(volunteerData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to add volunteer: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Attendance methods
  static async getEventAttendance(id: number): Promise<ApiResponse<EventAttendance[]>> {
    const response = await fetch(`${API_BASE}/${id}/attendance`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch event attendance: ${response.statusText}`);
    }
    
    return response.json();
  }

  static async createAttendance(eventId: number, attendanceData: CreateAttendanceRequest): Promise<ApiResponse<EventAttendance>> {
    const response = await fetch(`${API_BASE}/${eventId}/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(attendanceData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create attendance: ${response.statusText}`);
    }
    
    return response.json();
  }

  static async checkInAttendee(attendanceId: number, checkInMethod?: string): Promise<ApiResponse<EventAttendance>> {
    const response = await fetch(`${API_BASE}/attendance/${attendanceId}/checkin`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ check_in_method: checkInMethod }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to check in attendee: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Legacy method for backward compatibility
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