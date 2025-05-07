import { Request, Response } from 'express';
import { registerSchema, loginSchema, freelancerProfileSchema } from '@shared/schema';
import { storage } from '../storage';
import { auth } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  UserCredential 
} from 'firebase/auth';

// Register a new user
export async function register(req: Request, res: Response) {
  try {
    // Validate request data
    const userData = registerSchema.parse(req.body);
    
    // Check if username already exists
    const existingUser = await storage.getUserByUsername(userData.username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' });
    }
    
    // Check if email already exists
    const existingEmail = await storage.getUserByEmail(userData.email);
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    let firebaseUid = null;

    try {
      // Create Firebase user if Firebase is configured
      if (auth) {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          userData.email,
          userData.password
        );
        firebaseUid = userCredential.user.uid;
      }
    } catch (firebaseError: any) {
      console.error('Firebase registration error:', firebaseError);
      // Return specific error message if email already exists in Firebase
      if (firebaseError.code === 'auth/email-already-in-use') {
        return res.status(400).json({ message: 'Email already registered' });
      }
      // Continue with local authentication if Firebase is not available
    }
    
    // Create user in database
    const user = await storage.createUser({
      ...userData,
      firebaseUid
    });
    
    // Sanitize user data before sending response
    const { password, ...userWithoutPassword } = user;
    
    return res.status(201).json({
      message: 'User registered successfully',
      user: userWithoutPassword
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(400).json({ message: error.message });
  }
}

// Create a freelancer profile
export async function createFreelancerProfile(req: Request, res: Response) {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Validate freelancer profile data
    const profileData = freelancerProfileSchema.parse(req.body);
    
    // Check if user already has a freelancer profile
    const existingProfile = await storage.getFreelancerByUserId(req.user.id);
    if (existingProfile) {
      return res.status(400).json({ message: 'User already has a freelancer profile' });
    }
    
    // Create freelancer profile
    const freelancer = await storage.createFreelancer({
      ...profileData,
      userId: req.user.id
    });
    
    // Update user isClient status
    await storage.updateUser(req.user.id, { isClient: false });
    
    return res.status(201).json({
      message: 'Freelancer profile created successfully',
      profile: freelancer
    });
  } catch (error: any) {
    console.error('Freelancer profile creation error:', error);
    return res.status(400).json({ message: error.message });
  }
}

// Login user
export async function login(req: Request, res: Response) {
  try {
    // Validate login data
    const loginData = loginSchema.parse(req.body);
    
    // Try Firebase authentication first if available
    let firebaseUid: string | null = null;
    
    try {
      if (auth) {
        const userCredential = await signInWithEmailAndPassword(
          auth, 
          loginData.email, 
          loginData.password
        );
        firebaseUid = userCredential.user.uid;
        
        // Find user by Firebase UID
        const user = await storage.getUserByFirebaseUid(firebaseUid);
        if (user) {
          // Update last login time
          const updatedUser = await storage.updateUser(user.id, {});
          
          // Sanitize user data
          const { password, ...userWithoutPassword } = updatedUser;
          
          return res.status(200).json({
            message: 'Login successful',
            user: userWithoutPassword
          });
        }
      }
    } catch (firebaseError) {
      // Continue with local authentication if Firebase fails
      console.error('Firebase login error:', firebaseError);
    }
    
    // If Firebase auth failed or user not found by UID, try local authentication
    const user = await storage.getUserByEmail(loginData.email);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Simple password check (in a real app, use proper hashing)
    if (user.password !== loginData.password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Update last login time
    const updatedUser = await storage.updateUser(user.id, {});
    
    // Sanitize user data
    const { password, ...userWithoutPassword } = updatedUser;
    
    return res.status(200).json({
      message: 'Login successful',
      user: userWithoutPassword
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(400).json({ message: error.message });
  }
}

// Get current user
export async function getCurrentUser(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    // Retrieve fresh user data
    const user = await storage.getUser(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is a freelancer
    const freelancerProfile = await storage.getFreelancerByUserId(user.id);
    
    // Sanitize user data
    const { password, ...userWithoutPassword } = user;
    
    return res.status(200).json({
      user: userWithoutPassword,
      freelancerProfile: freelancerProfile || null
    });
  } catch (error: any) {
    console.error('Get current user error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Logout user (for session-based auth)
export function logout(req: Request, res: Response) {
  // Firebase auth is client-side, so we just clear any server-side session
  // For now, just return success
  return res.status(200).json({ message: 'Logged out successfully' });
}