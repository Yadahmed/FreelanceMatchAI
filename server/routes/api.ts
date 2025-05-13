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
  isAdmin,
  adminSessionAuth,
  deleteUser,
  deleteFreelancer,
  promoteToAdmin,
  revokeAdmin
} from '../controllers/adminController';
import { 
  sendMessage,
  sendDirectMessage
} from '../controllers/chatController';
import {
  processAIMessage,
  processJobRequest,
  checkAIStatus
} from '../controllers/aiController';
import ollamaRouter from './ollama';
import testOllamaRouter from './test-ollama';
import {
  getDashboard,
  updateProfile,
  getJobRequests as getFreelancerJobRequests,
  updateJobRequestStatus,
  getBookings as getFreelancerBookings,
  getNotifications,
  markNotificationAsRead,
  getChats as getFreelancerChats,
  getChatMessages as getFreelancerChatMessages
} from '../controllers/freelancerController';
import {
  createJobRequest,
  getJobRequests as getClientJobRequests,
  getBookings as getClientBookings,
  createBooking,
  checkFreelancerAvailability,
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

// Admin API endpoints with proper authentication and authorization
// Admin routes are protected by the adminSessionAuth middleware
router.get('/admin/users', adminSessionAuth, async (req, res) => {
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

// New admin routes using the admin controller
router.delete('/admin/users/:id', adminSessionAuth, deleteUser);
router.delete('/admin/freelancers/:id', adminSessionAuth, deleteFreelancer);
router.patch('/admin/users/:id/promote', adminSessionAuth, promoteToAdmin);
router.patch('/admin/users/:id/revoke', adminSessionAuth, revokeAdmin);

// Legacy endpoint to fix roles for a specific user
router.get('/admin/fix-role/:id', authenticateUser, isAdmin, async (req, res) => {
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
router.post('/chat/direct-message', requireAuth, sendDirectMessage);

// AI routes
router.get('/ai/status', checkAIStatus); // No authentication needed to check AI status
router.post('/ai/message', processAIMessage); // Removed requireAuth in development mode
router.post('/ai/job-analysis', processJobRequest); // Removed requireAuth to allow non-authenticated use

// Ollama routes (using a separate router)
router.use('/ollama', ollamaRouter);

// Ollama testing routes (no auth required)
router.use('/test-ollama', testOllamaRouter);

// Import these at the top level
import { storage } from '../storage';
import { db } from '../db';
import { freelancers } from '@shared/schema';

// Public freelancer routes (no auth required for AI job matching)
router.get('/freelancers', async (req, res) => {
  try {
    // Get all freelancers
    const allFreelancers = await storage.getAllFreelancers();
    
    // Return a list of public-facing information
    const freelancersResponse = allFreelancers.map(freelancer => ({
      id: freelancer.id,
      userId: freelancer.userId,
      displayName: `Freelancer ${freelancer.id}`,
      profession: freelancer.profession,
      skills: freelancer.skills,
      bio: freelancer.bio,
      hourlyRate: freelancer.hourlyRate,
      yearsOfExperience: freelancer.yearsOfExperience,
      location: freelancer.location,
      imageUrl: freelancer.imageUrl,
      rating: freelancer.rating,
      jobPerformance: freelancer.jobPerformance,
      skillsExperience: freelancer.skillsExperience,
      responsiveness: freelancer.responsiveness,
      fairnessScore: freelancer.fairnessScore,
      completedJobs: freelancer.completedJobs
    }));
    
    return res.json(freelancersResponse);
  } catch (error) {
    console.error('Error fetching all freelancers:', error);
    return res.status(500).json({ message: 'Error fetching freelancer data' });
  }
});

router.get('/freelancers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid freelancer ID' });
    }
    
    // Get the freelancer by their ID
    const freelancer = await storage.getFreelancerById(id);
    
    if (!freelancer) {
      return res.status(404).json({ message: 'Freelancer not found' });
    }
    
    // Return public-facing information
    return res.json({
      id: freelancer.id,
      userId: freelancer.userId,
      displayName: `Freelancer ${freelancer.id}`,
      profession: freelancer.profession,
      skills: freelancer.skills,
      bio: freelancer.bio,
      hourlyRate: freelancer.hourlyRate,
      yearsOfExperience: freelancer.yearsOfExperience,
      location: freelancer.location,
      imageUrl: freelancer.imageUrl,
      rating: freelancer.rating,
      jobPerformance: freelancer.jobPerformance,
      skillsExperience: freelancer.skillsExperience,
      responsiveness: freelancer.responsiveness,
      fairnessScore: freelancer.fairnessScore,
      completedJobs: freelancer.completedJobs
    });
  } catch (error) {
    console.error('Error fetching freelancer:', error);
    return res.status(500).json({ message: 'Error fetching freelancer data' });
  }
});

// Freelancer routes
router.get('/freelancer/dashboard', requireFreelancer, getDashboard);
router.patch('/freelancer/profile', requireFreelancer, updateProfile);
router.get('/freelancer/job-requests', requireFreelancer, getFreelancerJobRequests);
router.patch('/freelancer/job-requests/:id', requireFreelancer, updateJobRequestStatus);
router.get('/freelancer/bookings', requireFreelancer, getFreelancerBookings);
router.get('/freelancer/notifications', requireFreelancer, getNotifications);
router.patch('/freelancer/notifications/:id', requireFreelancer, markNotificationAsRead);
router.get('/freelancer/chats', requireFreelancer, getFreelancerChats);
router.get('/freelancer/chats/:chatId/messages', requireFreelancer, getFreelancerChatMessages);

// Client routes
router.post('/client/job-requests', requireClient, createJobRequest);
router.get('/client/job-requests', requireClient, getClientJobRequests);
router.get('/client/bookings', requireClient, getClientBookings);
router.post('/client/bookings', requireClient, createBooking);
router.get('/client/availability', requireClient, checkFreelancerAvailability);
router.post('/client/reviews', requireClient, createReview);
router.get('/client/chats', requireClient, getChatHistory);
router.get('/client/chats/:chatId/messages', requireClient, getChatMessages);
router.get('/client/preferences', requireClient, getUserPreferences);
router.post('/client/preferences', requireClient, updateUserPreferences);

export default router;