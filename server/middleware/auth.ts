import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { auth as firebaseAuth } from '../firebase';

// Extended Express Request type with user property
declare global {
    namespace Express {
        interface Request {
            user?: any;
            firebaseUser?: any;
        }
    }
}

// Middleware to authenticate user via Firebase
export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(); // No token, proceed without authentication
        }

        const token = authHeader.split('Bearer ')[1];
        if (!token) {
            return next(); // No token, proceed without authentication
        }

        // Verify token with Firebase
        if (!firebaseAuth) {
            console.error('Firebase Auth not initialized');
            return next(); // Firebase not initialized, proceed without authentication
        }

        try {
            // Verify the Firebase token
            const decodedToken = await firebaseAuth.verifyIdToken(token);
            
            // Get user from database by Firebase UID
            const user = await storage.getUserByFirebaseUid(decodedToken.uid);
            
            if (user) {
                // Attach user to request
                req.user = user;
                req.firebaseUser = decodedToken;
            }
            
            next();
        } catch (firebaseError) {
            console.error('Firebase token verification error:', firebaseError);
            next(); // Invalid token, proceed without authentication
        }
    } catch (error) {
        // Error in authentication process
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