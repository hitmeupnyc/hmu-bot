import { Effect } from 'effect';
import { Request, Response, Router } from 'express';
import { effectToExpress } from '~/services/effect/adapters/expressAdapter';
import { Flag, FlagLive } from '~/services/effect/layers/FlagLayer';
import { requireAuth } from '../middleware/auth';
import {
  DatabaseLive,
  DatabaseService,
} from '../services/effect/layers/DatabaseLayer';

const router = Router();

// Middleware to extract authenticated user
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

// GET /api/flags - List all available flags
router.get('/flags', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const dbService = yield* DatabaseService;

        return yield* dbService.query((db) =>
          db.selectFrom('flags').selectAll().orderBy('name').execute()
        );
      }).pipe(Effect.provide(DatabaseLive))
    );

    res.json(result);
  } catch (error) {
    console.error('Failed to fetch flags:', error);
    res.status(500).json({ error: 'Failed to fetch flags' });
  }
});

// GET /api/members/:id/flags - Get member's flags
router.get(
  '/members/:id/flags',
  requireAuth,
  effectToExpress((req: AuthRequest, res: Response) =>
    Effect.gen(function* () {
      const { id } = req.params;
      const flagService = yield* Flag;
      const result = yield* flagService.getMemberFlags(id);

      return result;
    }).pipe(Effect.provide(FlagLive))
  )
);

// POST /api/members/:id/flags - Grant flag to member
router.post(
  '/members/:id/flags',
  requireAuth,
  effectToExpress((req: AuthRequest, res: Response) =>
    Effect.gen(function* () {
      const { id } = req.params;
      const { flag_id, expires_at, reason, metadata } = req.body;

      if (!flag_id) {
        return res.status(400).json({ error: 'flag_id is required' });
      }

      const flagService = yield* Flag;
      yield* flagService.grantFlag(id, flag_id, {
        grantedBy: req.user!.email,
        expiresAt: expires_at ? new Date(expires_at) : undefined,
        metadata,
      });

      return res.json({
        success: true,
        message: `Flag ${flag_id} granted to ${id}`,
      });
    }).pipe(Effect.provide(FlagLive))
  )
);

// DELETE /api/members/:id/flags/:flagId - Revoke flag from member
router.delete(
  '/members/:id/flags/:flagId',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const { id, flagId } = req.params;
    const { reason } = req.body;

    try {
      await Effect.runPromise(
        Effect.gen(function* () {
          const flagService = yield* Flag;
          yield* flagService.revokeFlag(id, flagId, req.user!.email, reason);
        }).pipe(Effect.provide(FlagLive))
      );

      res.json({
        success: true,
        message: `Flag ${flagId} revoked from ${id}`,
      });
    } catch (error) {
      console.error('Failed to revoke flag:', error);
      res.status(500).json({ error: 'Failed to revoke flag' });
    }
  }
);

// GET /api/flags/:flagId/members - List members with specific flag
router.get(
  '/flags/:flagId/members',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const { flagId } = req.params;

    try {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const dbService = yield* DatabaseService;
          return yield* dbService.query((db) =>
            db
              .selectFrom('members_flags as mf')
              .innerJoin('members as m', 'm.id', 'mf.member_id')
              .select([
                'm.id',
                'm.email',
                'm.first_name',
                'm.last_name',
                'mf.granted_at',
                'mf.granted_by',
                'mf.expires_at',
              ])
              .where('mf.flag_id', '=', flagId)
              .execute()
          );
        }).pipe(Effect.provide(DatabaseLive))
      );

      res.json(result);
    } catch (error) {
      console.error('Failed to fetch flag members:', error);
      res.status(500).json({ error: 'Failed to fetch flag members' });
    }
  }
);

// POST /api/flags/bulk - Bulk flag operations
router.post(
  '/flags/bulk',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const { operations } = req.body;

    if (!Array.isArray(operations)) {
      return res.status(400).json({ error: 'operations must be an array' });
    }

    try {
      await Effect.runPromise(
        Effect.gen(function* () {
          const flagService = yield* Flag;

          const assignments = operations.map((op) => ({
            userId: op.userId,
            flagId: op.flag_id,
            options: {
              grantedBy: req.user!.email,
              expiresAt: op.expires_at ? new Date(op.expires_at) : undefined,
              reason: op.reason,
              metadata: op.metadata,
            },
          }));

          yield* flagService.bulkGrantFlags(assignments);
        }).pipe(Effect.provide(FlagLive))
      );

      return res.json({
        success: true,
        message: `Processed ${operations.length} flag operations`,
      });
    } catch (error) {
      console.error('Failed to process bulk flags:', error);
      return res
        .status(500)
        .json({ error: 'Failed to process bulk flag operations' });
    }
  }
);

// POST /api/flags/expire - Process expired flags
router.post(
  '/flags/expire',
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const flagService = yield* Flag;
          return yield* flagService.processExpiredFlags();
        }).pipe(Effect.provide(FlagLive))
      );

      res.json(result);
    } catch (error) {
      console.error('Failed to process expired flags:', error);
      res.status(500).json({ error: 'Failed to process expired flags' });
    }
  }
);

export { router as flagRoutes };
