import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { auth as firebaseAdmin } from 'firebase-admin';

// Extend the Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Middleware to authenticate requests using Firebase token
export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without setting req.user
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next(); // Continue without setting req.user
    }
    
    if (!firebaseAdmin.auth) {
      console.warn('Firebase auth not initialized. Skipping token verification.');
      return next();
    }
    
    try {
      // Verify and decode the token
      const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
      const firebaseUid = decodedToken.uid;
      
      // Get user by Firebase UID
      const user = await storage.getUserByFirebaseUid(firebaseUid);
      
      if (user) {
        req.user = user;
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      // Continue without setting req.user
    }
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
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