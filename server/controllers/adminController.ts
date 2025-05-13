import { Request, Response } from 'express';
import { storage } from '../storage';

/**
 * Admin controller for managing freelancers and users
 * This controller handles administrative operations like deleting freelancers and users
 */

// Admin middleware to check for admin session header
export async function adminSessionAuth(req: Request, res: Response, next: Function) {
  try {
    // Check for admin-session header
    const adminSession = req.headers['admin-session'] === 'true';
    
    if (adminSession) {
      // Admin session is valid
      console.log('Admin session authenticated');
      next();
      return;
    }
    
    // No admin session, check for user admin role as fallback
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Check if user is an admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    // User is admin, proceed
    next();
  } catch (error: any) {
    console.error('Admin auth error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Legacy admin middleware - kept for backward compatibility
export async function isAdmin(req: Request, res: Response, next: Function) {
  return adminSessionAuth(req, res, next);
}

// Get all users
export async function getAllUsers(req: Request, res: Response) {
  try {
    // This would need implementation in storage interface
    // For now, we'll just return a placeholder message
    return res.status(200).json({ 
      message: 'Admin: Get all users function (to be implemented)'
    });
  } catch (error: any) {
    console.error('Admin get all users error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Delete a user by ID (and their freelancer profile if exists)
export async function deleteUser(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    // Check if the user exists
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete the user (this will cascade to delete freelancer if exists)
    const success = await storage.deleteUser(userId);
    
    if (success) {
      return res.status(200).json({ 
        message: 'User deleted successfully',
        userId
      });
    } else {
      return res.status(500).json({ message: 'Failed to delete user' });
    }
  } catch (error: any) {
    console.error('Admin delete user error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Delete a freelancer by ID (keeps the user account)
export async function deleteFreelancer(req: Request, res: Response) {
  try {
    const freelancerId = parseInt(req.params.id);
    
    if (isNaN(freelancerId)) {
      return res.status(400).json({ message: 'Invalid freelancer ID' });
    }
    
    // Check if the freelancer exists
    const freelancer = await storage.getFreelancer(freelancerId);
    if (!freelancer) {
      return res.status(404).json({ message: 'Freelancer not found' });
    }
    
    // Delete just the freelancer profile
    const success = await storage.deleteFreelancer(freelancerId);
    
    if (success) {
      return res.status(200).json({
        message: 'Freelancer deleted successfully',
        freelancerId,
        userId: freelancer.userId
      });
    } else {
      return res.status(500).json({ message: 'Failed to delete freelancer' });
    }
  } catch (error: any) {
    console.error('Admin delete freelancer error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Promote a user to admin
export async function promoteToAdmin(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    // Check if the user exists
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update the user to be an admin
    const updatedUser = await storage.updateUser(userId, { isAdmin: true });
    
    return res.status(200).json({
      message: 'User promoted to admin successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        isAdmin: updatedUser.isAdmin
      }
    });
  } catch (error: any) {
    console.error('Admin promote user error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Revoke admin status from a user
export async function revokeAdmin(req: Request, res: Response) {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    // Check if the user exists
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent revoking your own admin status
    if (req.user && req.user.id === userId) {
      return res.status(400).json({ message: 'Cannot revoke your own admin status' });
    }
    
    // Update the user to not be an admin
    const updatedUser = await storage.updateUser(userId, { isAdmin: false });
    
    return res.status(200).json({
      message: 'Admin status revoked successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        isAdmin: updatedUser.isAdmin
      }
    });
  } catch (error: any) {
    console.error('Admin revoke admin error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}