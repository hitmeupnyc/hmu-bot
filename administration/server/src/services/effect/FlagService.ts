import { Context, Effect } from 'effect';
import { NotFoundError } from './errors/CommonErrors';

// Core Flag types
export interface Flag {
  id: string;
  name: string;
  description?: string;
  category?:
    | 'verification'
    | 'subscription'
    | 'feature'
    | 'compliance'
    | 'admin';
  created_at: Date;
  updated_at: Date;
}

export interface MemberFlag {
  member_id: string;
  flag_id: string;
  granted_at: Date;
  granted_by: string;
  expires_at?: Date;
  metadata?: Record<string, any>;
  revoked_at?: Date;
  revoked_by?: string;
  revoke_reason?: string;
}

export interface FlagGrantOptions {
  grantedBy: string;
  expiresAt?: Date;
  reason?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

export interface MemberFlagDetails {
  id: string;
  name: string;
  description?: string;
  category?: string;
  grantedAt: Date;
  expiresAt?: Date;
  grantedBy: string;
  expired: boolean;
  metadata?: Record<string, any>;
}

export interface ProcessingResult {
  processed: number;
  errors: number;
  duration: number;
}

// Error types
export class FlagError {
  readonly _tag = 'FlagError';
  constructor(
    public readonly message: string,
    public readonly cause?: unknown
  ) {}
}

// Core service interface - all methods return Effects with no dependencies
export interface IFlagService {
  readonly grantFlag: (
    userId: string,
    flagId: string,
    options: FlagGrantOptions
  ) => Effect.Effect<void, FlagError | NotFoundError, never>;

  readonly revokeFlag: (
    userId: string,
    flagId: string,
    revokedBy: string,
    reason?: string
  ) => Effect.Effect<void, FlagError | NotFoundError, never>;

  readonly getMemberFlags: (
    userId: string
  ) => Effect.Effect<MemberFlagDetails[], FlagError | NotFoundError, never>;

  readonly bulkGrantFlags: (
    assignments: Array<{
      userId: string;
      flagId: string;
      options: FlagGrantOptions;
    }>
  ) => Effect.Effect<void, FlagError | NotFoundError, never>;

  readonly processExpiredFlags: () => Effect.Effect<
    ProcessingResult,
    FlagError,
    never
  >;
}

export const FlagService = Context.GenericTag<IFlagService>('FlagService');
