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
    
    // Check if email is already registered
    const existingUserByEmail = await storage.getUserByEmail(userData.email);
    if (existingUserByEmail) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    
    // Check if username is already taken
    const existingUserByUsername = await storage.getUserByUsername(userData.username);
    if (existingUserByUsername) {
      return res.status(409).json({ message: 'Username already taken' });
    }
    
    // Create user account
    const user = await storage.createUser({
      username: userData.username,
      email: userData.email,
      password: '',  // Password is handled by Firebase
      displayName: userData.displayName || null,
      photoURL: userData.photoURL || null,
      firebaseUid: userData.firebaseUid,
      isClient: userData.isClient
    });
    
    // Update Firebase user display name and photo URL if provided
    if (firebaseAdminAuth && (userData.displayName || userData.photoURL)) {
      await firebaseAdminAuth.updateUser(userData.firebaseUid, {
        displayName: userData.displayName,
        photoURL: userData.photoURL
      });
    }
    
    return res.status(201).json({
      message: 'User registered successfully',
      user
    });
  } catch (error: any) {
    console.error('Register error:', error);
    return res.status(400).json({ message: error.message });
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
      // User doesn't exist yet, create a new user account
      user = await storage.createUser({
        username: loginData.email.split('@')[0], // Default username from email
        email: loginData.email,
        password: '', // Password handled by Firebase
        displayName: loginData.displayName || null,
        photoURL: loginData.photoURL || null,
        firebaseUid: loginData.firebaseUid,
        isClient: true // By default, new users are clients
      });
      
      // Update Firebase user display name if provided
      if (firebaseAdminAuth && loginData.displayName) {
        await firebaseAdminAuth.updateUser(loginData.firebaseUid, {
          displayName: loginData.displayName
        });
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
    return res.status(400).json({ message: error.message });
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