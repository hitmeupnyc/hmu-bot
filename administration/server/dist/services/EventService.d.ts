import { Event, CreateEventRequest, EventAttendance } from '../types';
export declare class EventService {
    private db;
    getEvents(options: {
        page: number;
        limit: number;
        upcoming?: boolean;
    }): Promise<{
        events: Event[];
        pagination: any;
    }>;
    getEventById(id: number): Promise<Event>;
    createEvent(data: CreateEventRequest): Promise<Event>;
    getEventAttendance(eventId: number): Promise<EventAttendance[]>;
    checkInMember(eventId: number, memberId: number): Promise<EventAttendance>;
    private buildEventFlags;
}
//# sourceMappingURL=EventService.d.ts.map