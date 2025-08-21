import { Effect } from 'effect';
import { beforeAll, describe, expect, test } from 'vitest';
import { AuthorizationService, AuthorizationServiceLive } from '../services/effect/AuthorizationEffects';
import { DatabaseService } from '../services/effect/context/DatabaseService';
import { DatabaseLive } from '../services/effect/layers/DatabaseLayer';

describe('CASL Authorization System', () => {
  const testUserId = 'test-user-123';
  const adminUserId = 'admin-user-456';
  const eventsManagerUserId = 'events-manager-789';

  beforeAll(async () => {
    // Set up test data - this would normally be done via migrations and seeding
    // For now, we'll assume the database is set up correctly
  });

  test('should build ability for user without flags', async () => {
    const buildAbilityEffect = Effect.gen(function* () {
      const authService = yield* AuthorizationService;
      return yield* authService.buildAbilityForUser(testUserId);
    });

    const ability = await Effect.runPromise(
      buildAbilityEffect.pipe(Effect.provide(AuthorizationServiceLive))
    );

    // User without flags should only be able to read/update their own member record
    expect(ability.can('read', 'Member', { id: testUserId })).toBe(true);
    expect(ability.can('update', 'Member', { id: testUserId })).toBe(true);
    expect(ability.can('read', 'Member', { id: 'other-user' })).toBe(false);
    expect(ability.can('create', 'Event')).toBe(false);
    expect(ability.can('manage', 'all')).toBe(false);
  });

  test('should build ability for admin user', async () => {
    // First grant admin flag to user
    const grantAdminFlagEffect = Effect.gen(function* () {
      const authService = yield* AuthorizationService;
      return yield* authService.grantFlag('admin@test.com', 'admin', 'system');
    });

    await Effect.runPromise(
      grantAdminFlagEffect.pipe(Effect.provide(AuthorizationServiceLive))
    );

    const buildAbilityEffect = Effect.gen(function* () {
      const authService = yield* AuthorizationService;
      return yield* authService.buildAbilityForUser(adminUserId);
    });

    const ability = await Effect.runPromise(
      buildAbilityEffect.pipe(Effect.provide(AuthorizationServiceLive))
    );

    // Admin should be able to do everything
    expect(ability.can('manage', 'all')).toBe(true);
    expect(ability.can('create', 'Event')).toBe(true);
    expect(ability.can('delete', 'Member')).toBe(true);
    expect(ability.can('read', 'AuditLog')).toBe(true);
  });

  test('should build ability for events manager', async () => {
    const grantEventsFlagEffect = Effect.gen(function* () {
      const authService = yield* AuthorizationService;
      return yield* authService.grantFlag('events@test.com', 'events_write', 'admin@test.com');
    });

    await Effect.runPromise(
      grantEventsFlagEffect.pipe(Effect.provide(AuthorizationServiceLive))
    );

    const buildAbilityEffect = Effect.gen(function* () {
      const authService = yield* AuthorizationService;
      return yield* authService.buildAbilityForUser(eventsManagerUserId);
    });

    const ability = await Effect.runPromise(
      buildAbilityEffect.pipe(Effect.provide(AuthorizationServiceLive))
    );

    // Events manager should be able to manage events but not members
    expect(ability.can('manage', 'Event')).toBe(true);
    expect(ability.can('create', 'Event')).toBe(true);
    expect(ability.can('update', 'Event')).toBe(true);
    expect(ability.can('delete', 'Event')).toBe(true);
    expect(ability.can('manage', 'Member')).toBe(false);
    expect(ability.can('manage', 'all')).toBe(false);
  });

  test('should check permissions correctly', async () => {
    const checkPermissionEffect = Effect.gen(function* () {
      const authService = yield* AuthorizationService;
      
      // Test regular user permissions
      const canReadEvent = yield* authService.checkPermission(testUserId, 'read', 'Event');
      const canCreateEvent = yield* authService.checkPermission(testUserId, 'create', 'Event');
      
      return { canReadEvent, canCreateEvent };
    });

    const result = await Effect.runPromise(
      checkPermissionEffect.pipe(Effect.provide(AuthorizationServiceLive))
    );

    expect(result.canReadEvent).toBe(false); // User without verified flags can't read events
    expect(result.canCreateEvent).toBe(false); // User can't create events
  });

  test('should grant and revoke flags correctly', async () => {
    const memberEmail = 'testmember@example.com';
    const flagId = 'socials_approved';

    // Grant flag
    const grantFlagEffect = Effect.gen(function* () {
      const authService = yield* AuthorizationService;
      return yield* authService.grantFlag(memberEmail, flagId, 'admin@test.com');
    });

    await Effect.runPromise(
      grantFlagEffect.pipe(Effect.provide(AuthorizationServiceLive))
    );

    // Check flag exists
    const checkFlagEffect = Effect.gen(function* () {
      const authService = yield* AuthorizationService;
      return yield* authService.memberHasFlag(memberEmail, flagId);
    });

    const hasFlag = await Effect.runPromise(
      checkFlagEffect.pipe(Effect.provide(AuthorizationServiceLive))
    );

    expect(hasFlag).toBe(true);

    // Revoke flag
    const revokeFlagEffect = Effect.gen(function* () {
      const authService = yield* AuthorizationService;
      return yield* authService.revokeFlag(memberEmail, flagId);
    });

    await Effect.runPromise(
      revokeFlagEffect.pipe(Effect.provide(AuthorizationServiceLive))
    );

    // Check flag no longer exists
    const hasRevokedFlag = await Effect.runPromise(
      checkFlagEffect.pipe(Effect.provide(AuthorizationServiceLive))
    );

    expect(hasRevokedFlag).toBe(false);
  });

  test('should get user flags correctly', async () => {
    const memberEmail = 'multiflag@example.com';
    
    // Grant multiple flags
    const grantMultipleFlagsEffect = Effect.gen(function* () {
      const authService = yield* AuthorizationService;
      yield* authService.grantFlag(memberEmail, 'socials_approved', 'admin@test.com');
      yield* authService.grantFlag(memberEmail, 'video_verified', 'admin@test.com');
      yield* authService.grantFlag(memberEmail, 'identity_verified', 'admin@test.com');
    });

    await Effect.runPromise(
      grantMultipleFlagsEffect.pipe(Effect.provide(AuthorizationServiceLive))
    );

    // Get user flags
    const getFlagsEffect = Effect.gen(function* () {
      const dbService = yield* DatabaseService;
      const member = yield* dbService.query((db) =>
        db.selectFrom('members')
          .select('id')
          .where('email', '=', memberEmail)
          .executeTakeFirst()
      );
      
      if (!member) throw new Error('Member not found');
      
      const authService = yield* AuthorizationService;
      return yield* authService.getUserFlags(member.id);
    });

    const flags = await Effect.runPromise(
      getFlagsEffect.pipe(
        Effect.provide(AuthorizationServiceLive),
        Effect.provide(DatabaseLive)
      )
    );

    expect(flags).toContain('socials_approved');
    expect(flags).toContain('video_verified');
    expect(flags).toContain('identity_verified');
    expect(flags).toHaveLength(3);
  });

  test('should handle verified user permissions', async () => {
    const verifiedUserEmail = 'verified@example.com';
    
    // Grant verification flag
    const grantVerificationEffect = Effect.gen(function* () {
      const authService = yield* AuthorizationService;
      return yield* authService.grantFlag(verifiedUserEmail, 'socials_approved', 'admin@test.com');
    });

    await Effect.runPromise(
      grantVerificationEffect.pipe(Effect.provide(AuthorizationServiceLive))
    );

    // Get member ID for ability building
    const getMemberEffect = Effect.gen(function* () {
      const dbService = yield* DatabaseService;
      return yield* dbService.query((db) =>
        db.selectFrom('members')
          .select('id')
          .where('email', '=', verifiedUserEmail)
          .executeTakeFirst()
      );
    });

    const member = await Effect.runPromise(
      getMemberEffect.pipe(Effect.provide(DatabaseLive))
    );

    if (!member) throw new Error('Member not found');

    // Build ability for verified user
    const buildAbilityEffect = Effect.gen(function* () {
      const authService = yield* AuthorizationService;
      return yield* authService.buildAbilityForUser(member.id);
    });

    const ability = await Effect.runPromise(
      buildAbilityEffect.pipe(Effect.provide(AuthorizationServiceLive))
    );

    // Verified user should be able to read events and members
    expect(ability.can('read', 'Event')).toBe(true);
    expect(ability.can('read', 'Member')).toBe(true);
    expect(ability.can('view', 'Organization')).toBe(true);
    expect(ability.can('create', 'Event')).toBe(false); // But not create events
  });
});