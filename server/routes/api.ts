import { Router } from 'express';
import { 
  register, 
  login, 
  createFreelancerProfile, 
  getCurrentUser, 
  logout,
  checkUsername
} from '../controllers/authController';
import { 
  sendMessage 
} from '../controllers/chatController';
import {
  processAIMessage,
  processJobRequest,
  checkAIStatus
} from '../controllers/aiController';
import ollamaRouter from './ollama';
import {
  getDashboard,
  updateProfile,
  getJobRequests as getFreelancerJobRequests,
  updateJobRequestStatus,
  getBookings as getFreelancerBookings,
  getNotifications,
  markNotificationAsRead
} from '../controllers/freelancerController';
import {
  createJobRequest,
  getJobRequests as getClientJobRequests,
  getBookings as getClientBookings,
  createReview,
  getChatHistory,
  getChatMessages,
  getUserPreferences,
  updateUserPreferences
} from '../controllers/clientController';
import { 
  authenticateUser, 
  requireAuth, 
  requireClient, 
  requireFreelancer 
} from '../middleware/auth';

const router = Router();

// Add public routes (no auth required) first
router.get('/auth/check-username', checkUsername); // No auth required, used during registration

// Admin API endpoints for debugging
// In a production app, these would be protected by admin authentication

// Get all users endpoint
router.get('/admin/users', async (req, res) => {
  try {
    // Import the storage and db directly
    const { storage } = require('../storage');
    const { db } = require('../db');
    const { users } = require('@shared/schema');
    
    // Get all users directly from the database
    const allUsers = await db.select().from(users);
    
    return res.json({
      message: 'All users retrieved',
      users: allUsers
    });
  } catch (error) {
    console.error('Error getting users:', error);
    return res.status(500).json({ message: 'Server error getting users' });
  }
});

// Endpoint to fix roles for a specific user
router.get('/admin/fix-role/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);
    
    // Import the storage from the parent file
    const { storage } = require('../storage');
    const { db } = require('../db');
    const { users, freelancers } = require('@shared/schema');
    const { eq } = require('drizzle-orm');
    
    // Get the current user
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get freelancer to check if this user has a freelancer profile
    const freelancer = await storage.getFreelancerByUserId(userId);
    
    console.log('Admin - Current user state:', { 
      userId, 
      isClient: user.isClient,
      hasFreelancerProfile: !!freelancer 
    });
    
    // Always force update to ensure the flag is set correctly
    console.log('Admin - Forcing user role update. Setting isClient=false');
    
    // Use direct DB query for maximum reliability
    const [updatedUser] = await db
      .update(users)
      .set({ isClient: false })
      .where(eq(users.id, userId))
      .returning();
    
    return res.status(200).json({ 
      message: 'User role fixed',
      before: { isClient: user.isClient },
      after: { isClient: updatedUser.isClient },
      hasFreelancerProfile: !!freelancer
    });
  } catch (error) {
    console.error('Role fix error:', error);
    return res.status(500).json({ message: 'Error fixing role', error: String(error) });
  }
});

// Apply authentication middleware to all other routes
router.use(authenticateUser);

// Auth routes
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/freelancer-profile', requireAuth, createFreelancerProfile);
router.get('/auth/me', requireAuth, getCurrentUser);
router.post('/auth/logout', logout);

// Chat routes
router.post('/chat/message', requireAuth, sendMessage);

// AI routes
router.get('/ai/status', checkAIStatus);
router.post('/ai/message', requireAuth, processAIMessage);
router.post('/ai/job-analysis', requireAuth, processJobRequest);

// Ollama routes (using a separate router)
router.use('/ollama', ollamaRouter);

// Freelancer routes
router.get('/freelancer/dashboard', requireFreelancer, getDashboard);
router.patch('/freelancer/profile', requireFreelancer, updateProfile);
router.get('/freelancer/job-requests', requireFreelancer, getFreelancerJobRequests);
router.patch('/freelancer/job-requests/:id', requireFreelancer, updateJobRequestStatus);
router.get('/freelancer/bookings', requireFreelancer, getFreelancerBookings);
router.get('/freelancer/notifications', requireFreelancer, getNotifications);
router.patch('/freelancer/notifications/:id', requireFreelancer, markNotificationAsRead);

// Client routes
router.post('/client/job-requests', requireClient, createJobRequest);
router.get('/client/job-requests', requireClient, getClientJobRequests);
router.get('/client/bookings', requireClient, getClientBookings);
router.post('/client/reviews', requireClient, createReview);
router.get('/client/chats', requireClient, getChatHistory);
router.get('/client/chats/:chatId/messages', requireClient, getChatMessages);
router.get('/client/preferences', requireClient, getUserPreferences);
router.post('/client/preferences', requireClient, updateUserPreferences);

export default router;