/**
 * Events Management Types and Enums
 * Domain-specific types for the events management system
 */

// Import selectable types for proper typing

// Eventbrite Events Status Bitfield
export const EventbriteEventStatus = {
  DRAFT: 1,
  LIVE: 2,
  ENDED: 4,
  CANCELED: 8,
} as const;

export type EventbriteEventStatusType =
  (typeof EventbriteEventStatus)[keyof typeof EventbriteEventStatus];

// Eventbrite Events Flags Bitfield
export const EventbriteEventFlags = {
  ACTIVE: 1,
  SYNC_ERROR: 2,
  SYNC_PAUSED: 4,
  IS_FREE: 8,
  IS_ONLINE_EVENT: 16,
  IS_RESERVED_SEATING: 32,
} as const;

export type EventbriteEventFlagsType =
  (typeof EventbriteEventFlags)[keyof typeof EventbriteEventFlags];

// Utility functions for bitfield operations
export class BitfieldHelper {
  static hasFlag(value: number, flag: number): boolean {
    return (value & flag) === flag;
  }

  static addFlag(value: number, flag: number): number {
    return value | flag;
  }

  static removeFlag(value: number, flag: number): number {
    return value & ~flag;
  }

  static toggleFlag(value: number, flag: number): number {
    return value ^ flag;
  }
}
