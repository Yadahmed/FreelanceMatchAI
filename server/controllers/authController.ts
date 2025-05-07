import { Request, Response } from 'express';
import { storage } from '../storage';
import { loginSchema, registerSchema, freelancerProfileSchema } from '@shared/schema';
import { auth as firebaseAdminAuth } from '../firebase';

// Register a new user
export async function register(req: Request, res: Response) {
  try {
    // Validate request body
    const userData = registerSchema.parse(req.body);
    
    // Check if firebase uid is provided (from auth middleware)
    if (!userData.firebaseUid) {
      return res.status(400).json({ message: 'Firebase authentication required' });
    }
    
    // Check if user already exists by Firebase UID
    const existingUserByFirebaseUid = await storage.getUserByFirebaseUid(userData.firebaseUid);
    if (existingUserByFirebaseUid) {
      // User already exists, just return the user
      return res.status(200).json({
        message: 'User already registered',
        user: existingUserByFirebaseUid
      });
    }
    
    // Check if email is already registered
    const existingUserByEmail = await storage.getUserByEmail(userData.email);
    if (existingUserByEmail) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    
    // Process username - if supplied by user, check for uniqueness
    // If not provided or conflicts, generate a unique one
    let username = userData.username;
    let usernameChanged = false;
    
    if (!username || username.trim() === '') {
      usernameChanged = true;
    } else {
      // Check if username is already taken
      const existingUserByUsername = await storage.getUserByUsername(username);
      if (existingUserByUsername) {
        usernameChanged = true;
      }
    }
    
    // If username needs to be changed, generate a unique timestamp-based one
    if (usernameChanged) {
      const timestamp = Date.now().toString(36);
      const randomStr = Math.random().toString(36).substring(2, 5);
      const emailBase = userData.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      username = `${emailBase}_${timestamp}${randomStr}`.substring(0, 50);
    }
    
    // Create user account with the (potentially new) username
    const user = await storage.createUser({
      username: username,
      email: userData.email,
      password: '',  // Password is handled by Firebase
      displayName: userData.displayName || null,
      photoURL: userData.photoURL || null,
      firebaseUid: userData.firebaseUid,
      isClient: userData.isClient ?? true // Default to client if not specified
    });
    
    // Update Firebase user display name and photo URL if provided
    if (firebaseAdminAuth && (userData.displayName || userData.photoURL)) {
      try {
        await firebaseAdminAuth.updateUser(userData.firebaseUid, {
          displayName: userData.displayName || undefined,
          photoURL: userData.photoURL || undefined
        });
      } catch (firebaseError) {
        console.error('Firebase user update error:', firebaseError);
        // Continue with registration even if the Firebase update fails
      }
    }
    
    return res.status(201).json({
      message: 'User registered successfully',
      user,
      usernameChanged: usernameChanged ? username : undefined // Inform the client if username was changed
    });
  } catch (error: any) {
    console.error('Register error:', error);
    // Provide more detailed error messages
    return res.status(400).json({ 
      message: error.message || 'Registration failed',
      details: error.errors || error 
    });
  }
}

// Create a freelancer profile for an existing user
export async function createFreelancerProfile(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Validate request body
    const profileData = freelancerProfileSchema.parse(req.body);
    
    // Check if user already has a freelancer profile
    const existingProfile = await storage.getFreelancerByUserId(req.user.id);
    if (existingProfile) {
      return res.status(409).json({ message: 'Freelancer profile already exists' });
    }
    
    // Create freelancer profile
    const freelancer = await storage.createFreelancer({
      userId: req.user.id,
      profession: profileData.profession,
      skills: profileData.skills,
      bio: profileData.bio,
      hourlyRate: profileData.hourlyRate,
      location: profileData.location,
      yearsOfExperience: profileData.yearsOfExperience || null,
      timeZone: profileData.timeZone || null,
      availability: profileData.availability,
      portfolioLinks: profileData.portfolioLinks || [],
      websiteUrl: profileData.websiteUrl || null,
      imageUrl: profileData.imageUrl || null
    });
    
    // Update user to not be a client
    await storage.updateUser(req.user.id, { isClient: false });
    
    return res.status(201).json({
      message: 'Freelancer profile created successfully',
      freelancer
    });
  } catch (error: any) {
    console.error('Create freelancer profile error:', error);
    return res.status(400).json({ message: error.message });
  }
}

// Login a user
export async function login(req: Request, res: Response) {
  try {
    // Validate request body
    const loginData = loginSchema.parse(req.body);
    
    // Check if firebase uid is provided (from auth middleware)
    if (!loginData.firebaseUid) {
      return res.status(400).json({ message: 'Firebase authentication required' });
    }
    
    // Check if user exists
    let user = await storage.getUserByFirebaseUid(loginData.firebaseUid);
    
    if (!user) {
      // Check if user exists by email first (for migration scenarios)
      const existingUserByEmail = await storage.getUserByEmail(loginData.email);
      
      if (existingUserByEmail) {
        // If a user with this email exists, update their Firebase UID
        user = await storage.updateUser(existingUserByEmail.id, {
          firebaseUid: loginData.firebaseUid,
          lastLogin: new Date()
        });
      } else {
        // User doesn't exist yet, create a new user account
        try {
          // Generate a guaranteed unique username using timestamp and random string
          const timestamp = Date.now().toString(36);
          const randomStr = Math.random().toString(36).substring(2, 5);
          const emailBase = loginData.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
          const username = `${emailBase}_${timestamp}${randomStr}`.substring(0, 50);
          
          user = await storage.createUser({
            username: username,
            email: loginData.email,
            password: '', // Password handled by Firebase
            displayName: loginData.displayName || null,
            photoURL: loginData.photoURL || null,
            firebaseUid: loginData.firebaseUid,
            isClient: true // By default, new users are clients
          });
          
          // Update Firebase user display name if provided
          if (firebaseAdminAuth && loginData.displayName) {
            try {
              await firebaseAdminAuth.updateUser(loginData.firebaseUid, {
                displayName: loginData.displayName || undefined,
                photoURL: loginData.photoURL || undefined
              });
            } catch (firebaseError) {
              console.error('Firebase user update error:', firebaseError);
              // Continue with login even if the Firebase update fails
            }
          }
        } catch (error: any) {
          console.error('Error creating user during login:', error);
          // Return a more user-friendly error
          return res.status(500).json({ 
            message: 'Unable to create user account. Please try again or register manually.' 
          });
        }
      }
    } else {
      // Update last login time
      user = await storage.updateUser(user.id, { lastLogin: new Date() });
    }
    
    return res.status(200).json({
      message: 'Login successful',
      user
    });
  } catch (error: any) {
    console.error('Login error:', error);
    // Provide more detailed error messages
    return res.status(400).json({ 
      message: error.message || 'Login failed',
      details: error.errors || error 
    });
  }
}

// Get the current authenticated user
export async function getCurrentUser(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Check if user is a freelancer
    const freelancer = !req.user.isClient 
      ? await storage.getFreelancerByUserId(req.user.id)
      : null;
    
    return res.status(200).json({
      user: req.user,
      freelancer
    });
  } catch (error: any) {
    console.error('Get current user error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Logout a user (client-side only, just for API consistency)
export function logout(req: Request, res: Response) {
  return res.status(200).json({ message: 'Logout successful' });
}

// Check if a username is already taken
export async function checkUsername(req: Request, res: Response) {
  try {
    const { username } = req.query;
    
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ message: 'Username parameter is required' });
    }
    
    const existingUser = await storage.getUserByUsername(username);
    
    return res.status(200).json({
      exists: !!existingUser,
      available: !existingUser
    });
  } catch (error: any) {
    console.error('Check username error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}