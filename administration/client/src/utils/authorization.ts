// Access level constants
const ACCESS_LEVELS = {
  MEMBER: 1,
  MODERATOR: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
} as const;

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

export function getAccessLevelColor(level: number): string {
  switch (level) {
    case ACCESS_LEVELS.SUPER_ADMIN:
      return 'bg-red-100 text-red-800';
    case ACCESS_LEVELS.ADMIN:
      return 'bg-purple-100 text-purple-800';
    case ACCESS_LEVELS.MODERATOR:
      return 'bg-blue-100 text-blue-800';
    case ACCESS_LEVELS.MEMBER:
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
