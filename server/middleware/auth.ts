import { Request, Response, NextFunction } from 'express';
import { auth } from '../firebase';
import { storage } from '../storage';

// Add user property to Express Request
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

// Middleware to authenticate a user based on Firebase token
export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract the token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token, but don't block the request - just mark as unauthenticated
      return next();
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      return next();
    }
    
    try {
      // Verify token with Firebase
      if (!auth) {
        console.warn('Firebase Auth not initialized, skipping token verification');
        return next();
      }
      
      const decodedToken = await auth.verifyIdToken(token);
      const firebaseUid = decodedToken.uid;
      
      // Find user in database
      const user = await storage.getUserByFirebaseUid(firebaseUid);
      
      if (user) {
        // Attach user to request
        req.user = user;
      }
      
      next();
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      next();
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    next();
  }
}

// Middleware to require authentication
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
}

// Middleware to require client role
export function requireClient(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (!req.user.isClient) {
    return res.status(403).json({ message: 'Client access required' });
  }
  
  next();
}

// Middleware to require freelancer role
export function requireFreelancer(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.isClient) {
    return res.status(403).json({ message: 'Freelancer access required' });
  }
  
  next();
}