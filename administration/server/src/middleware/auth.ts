import { Request, Response, NextFunction } from 'express';
import { auth } from '../auth';

// Extend Express Request type to include session
declare global {
  namespace Express {
    interface Request {
      session?: {
        user: {
          id: string;
          email: string;
          name: string;
          emailVerified: boolean;
        };
        session: {
          id: string;
          userId: string;
          expiresAt: Date;
        };
      };
    }
  }
}

/**
 * Middleware to require authentication for routes
 * Checks for a valid session and attaches it to the request
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get session from Better Auth
    const session = await auth.api.getSession({
      headers: req.headers as any, // Better Auth expects a Headers object
    });

    if (!session) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHENTICATED',
      });
      return;
    }

    // Attach session to request for use in route handlers
    req.session = session;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * Middleware to optionally attach session if available
 * Does not require authentication but makes session available if present
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers as any, // Better Auth expects a Headers object
    });

    if (session) {
      req.session = session;
    }
    next();
  } catch (error) {
    // Silently continue without session
    next();
  }
};

/**
 * Middleware to check if user has specific access level
 * Must be used after requireAuth
 */
export const requireAccessLevel = (minLevel: number) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.session) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHENTICATED',
      });
      return;
    }

    // TODO: Check user's access level from members table
    // For now, all authenticated users are allowed
    next();
  };
};