# Database Analysis - Dead Code and Unused Tables

## Overview
Analysis of the current database structure and code dependencies to identify unused database tables and dead code paths.

## Database Schema Summary
- **Total tables**: 18 (excluding system tables)
- **Tables with data**: 8 tables have actual records
- **Empty tables**: 10 tables are completely empty

## Tables with Data (Used)
1. `members` - 79 records ✅ **ACTIVE**
2. `events` - 81 records ✅ **ACTIVE**  
3. `events_marketing` - 40 records ✅ **ACTIVE**
4. `events_volunteers` - 12 records ✅ **ACTIVE**
5. `user` - 2 records ✅ **ACTIVE** (Better Auth)
6. `session` - 2 records ✅ **ACTIVE** (Better Auth)

### Intentionally unused services and routes

These types are useful for future reference, though they're not currently used:
1. `types/events.ts`

Based on dependency analysis, these services are fully implemented but unused:
1. `EventbriteSyncEffects.ts` - Eventbrite integration
2. `PatreonSyncEffects.ts` - Patreon integration  
3. `DiscordSyncEffects.ts` - Discord integration
4. `KlaviyoSyncEffects.ts` - Klaviyo integration
5. `AuditEffects.ts` - Audit logging
6. `BaseSyncEffects.ts` - Base sync functionality

These services are "used" in these routes, but the integration has not been completed yet:
1. `discordRoutes.ts`
2. `patreonRoutes.ts` 
3. `klaviyoRoutes.ts`
4. `webhookRoutes.ts`

These must be kept, as their implementation is queued for the near future.

## Potentially Dead Tables

1. `payment_statuses`
1. `membership_types`

### Eventbrite Integration Tables
- `eventbrite_events` - 0 records ❌ **UNUSED**
- `events_eventbrite_link` - 0 records ❌ **UNUSED**

**Code Analysis**: These tables have TypeScript interfaces and some code references in:
- `types/index.ts:276,279` - Interface definitions
- `EventbriteSyncEffects.ts:224` - Has code that would use `event_attendance` table
- Migration `004_events_management_system.ts` - Schema definitions

**Status**: The Eventbrite integration appears to be planned but never implemented with actual data.

### Authentication Tables (Better Auth)
- `account` - 0 records ❌ **UNUSED**
- `verification` - 0 records ❌ **UNUSED**

**Code Analysis**: These are part of Better Auth but may not be actively used if only session-based auth is implemented.

### Attendance Tracking Tables
- `events_attendance` - 0 records ❌ **UNUSED** 
- `event_attendance` - 0 records ❌ **UNUSED**

**Critical Finding**: There are TWO attendance tables with different schemas:
1. `event_attendance` - From migration 001 (older, simpler schema)
2. `events_attendance` - From migration 004 (newer, more comprehensive)

**Code Analysis**: 
- Both tables defined in `types/index.ts:275,278`
- `EventbriteSyncEffects.ts:224` references `event_attendance`
- `types/events.ts:151` references `events_attendance`
- Neither table has actual data

### Integration/Sync Tables
- `sync_operations` - 0 records ❌ **UNUSED**
- `external_integrations` - 0 records ❌ **UNUSED**
- `member_memberships` - 0 records ❌ **UNUSED**
- `audit_log` - 0 records ❌ **UNUSED**

**Code Analysis**: These have full code implementations in Effect-TS services but no actual usage.

## Dead Code Analysis

### Schema Conflicts
The dual attendance table setup suggests incomplete refactoring:
- `event_attendance` (old) vs `events_attendance` (new)
- Code references both but data exists in neither

## Recommendations

### Immediate Actions
1. **Drop unused Eventbrite tables** if integration not planned soon
2. **Drop unused attendance tables** - neither schema has data
3. **Drop unused member_memberships table** - we'll track memberships a different way
4. **Remove unused Better Auth tables** if using session-only auth
5. **Remove unused routes** and related controllers (but keep those named above.)

## Impact Assessment
- **Database size reduction**: ~10 empty tables could be removed
- **Code cleanup**: ~6 service files could be removed  
- **Reduced complexity**: Fewer unused code paths to maintain
