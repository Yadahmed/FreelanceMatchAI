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
        
        // Add debug logging
        console.log(`[authenticateUser] Request path: ${req.path}, Method: ${req.method}`);
        console.log(`[authenticateUser] Auth header present: ${!!authHeader}`);
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('[authenticateUser] No Bearer token in Authorization header');
            return next(); // No token, proceed without authentication
        }

        const token = authHeader.split('Bearer ')[1];
        if (!token) {
            console.log('[authenticateUser] Empty token after splitting');
            return next(); // No token, proceed without authentication
        }
        
        console.log('[authenticateUser] Token found, length:', token.length);

        // Verify token with Firebase
        if (!firebaseAuth) {
            console.error('[authenticateUser] Firebase Auth not initialized');
            return next(); // Firebase not initialized, proceed without authentication
        }

        try {
            // Verify the Firebase token
            const decodedToken = await firebaseAuth.verifyIdToken(token);
            console.log(`[authenticateUser] Token verified for user: ${decodedToken.uid}`);
            
            // Get user from database by Firebase UID
            const user = await storage.getUserByFirebaseUid(decodedToken.uid);
            
            if (user) {
                // Attach user to request
                req.user = user;
                req.firebaseUser = decodedToken;
                console.log(`[authenticateUser] User found in database: ${user.id}, isClient: ${user.isClient}`);
            } else {
                console.log(`[authenticateUser] User ${decodedToken.uid} not found in database`);
            }
            
            next();
        } catch (firebaseError) {
            console.error('[authenticateUser] Firebase token verification error:', firebaseError);
            next(); // Invalid token, proceed without authentication
        }
    } catch (error) {
        // Error in authentication process
        console.error('[authenticateUser] Authentication error:', error);
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