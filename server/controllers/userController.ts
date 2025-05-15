import { Request, Response } from 'express';
import { storage } from '../storage';

// Get all users (basic info only for display purposes)
export async function getAllUsers(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const allUsers = await storage.getAllUsers();
    
    // Return only the necessary fields for display
    const usersResponse = allUsers.map(user => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName || `User ${user.id}`,
      photoURL: user.photoURL || null,
      isClient: user.isClient
    }));
    
    return res.json(usersResponse);
  } catch (error) {
    console.error('Error fetching all users:', error);
    return res.status(500).json({ message: 'Error fetching user data' });
  }
}

// Get a specific user by ID
export async function getUserById(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    const user = await storage.getUser(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return only the necessary fields
    return res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName || `User ${user.id}`,
      photoURL: user.photoURL || null,
      isClient: user.isClient
    });
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return res.status(500).json({ message: 'Error fetching user data' });
  }
}