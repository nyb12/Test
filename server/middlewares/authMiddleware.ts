import { Request, Response, NextFunction } from 'express';
import 'express-session';

// Augment Express Request interface to include user property and session
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Augment express-session to include user property
declare module 'express-session' {
  interface SessionData {
    user?: any;
  }
}

/**
 * Authentication middleware to protect routes
 * Checks if user is logged in via session
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  // Check if user is authenticated via session
  if (!req.session?.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // Set user data on request object
  req.user = req.session.user;
  
  // Continue to the next middleware or route handler
  next();
};

/**
 * Optional authentication middleware
 * Populates req.user if session exists but doesn't block request if missing
 */
export const optionalAuthenticate = (req: Request, res: Response, next: NextFunction) => {
  // If session exists and has user, set user data
  if (req.session?.user) {
    req.user = req.session.user;
  }
  
  // Continue to the next middleware or route handler regardless
  next();
};