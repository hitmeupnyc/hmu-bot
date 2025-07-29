// Access level constants
export const ACCESS_LEVELS = {
  MEMBER: 1,
  MODERATOR: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
} as const;

export type AccessLevel = typeof ACCESS_LEVELS[keyof typeof ACCESS_LEVELS];

// Authorization check functions
export function hasAccessLevel(userLevel: number, requiredLevel: AccessLevel): boolean {
  return userLevel >= requiredLevel;
}

export function canManageMembers(userLevel: number): boolean {
  return hasAccessLevel(userLevel, ACCESS_LEVELS.MODERATOR);
}

export function canManageEvents(userLevel: number): boolean {
  return hasAccessLevel(userLevel, ACCESS_LEVELS.MODERATOR);
}

export function canViewAuditLogs(userLevel: number): boolean {
  return hasAccessLevel(userLevel, ACCESS_LEVELS.ADMIN);
}

export function canManageSettings(userLevel: number): boolean {
  return hasAccessLevel(userLevel, ACCESS_LEVELS.SUPER_ADMIN);
}

export function getAccessLevelName(level: number): string {
  switch (level) {
    case ACCESS_LEVELS.SUPER_ADMIN:
      return 'Super Admin';
    case ACCESS_LEVELS.ADMIN:
      return 'Admin';
    case ACCESS_LEVELS.MODERATOR:
      return 'Moderator';
    case ACCESS_LEVELS.MEMBER:
    default:
      return 'Member';
  }
}