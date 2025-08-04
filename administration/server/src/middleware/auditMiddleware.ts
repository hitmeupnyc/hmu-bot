import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request type to include audit info
declare global {
  namespace Express {
    interface Request {
      auditInfo?: {
        sessionId: string;
        userIp: string;
      };
    }
  }
}

/**
 * Middleware to extract audit information from request
 */
export const auditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const sessionId = req.headers['x-session-id'] as string || 
                   uuidv4();
  
  const userIp = req.ip || 
                req.connection.remoteAddress || 
                req.headers['x-forwarded-for'] as string ||
                'unknown';

  req.auditInfo = {
    sessionId,
    userIp: Array.isArray(userIp) ? userIp[0] : userIp,
  };

  next();
};