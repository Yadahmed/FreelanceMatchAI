import { Router } from 'express';
import { storage } from '../storage';
import { db } from '../db';
import { users, freelancers } from '@shared/schema';
import { 
  register, 
  login, 
  createFreelancerProfile, 
  getCurrentUser, 
  logout,
  checkUsername,
  updateUserProfile
} from '../controllers/authController';
import {
  isAdmin,
  adminSessionAuth,
  getAllUsers,
  deleteUser,
  deleteFreelancer,
  promoteToAdmin,
  revokeAdmin
} from '../controllers/adminController';
import { extractFreelancerName } from '../utils/freelancer';
import { 
  sendMessage,
  sendDirectMessage,
  initChat
} from '../controllers/chatController';
import {
  processAIMessage,
  processJobRequest,
  checkAIStatus
} from '../controllers/aiController';
// Import all job request controller functions
import * as jobRequestController from '../controllers/jobRequestController';
import ollamaRouter from './ollama';
import testOllamaRouter from './test-ollama';
import {
  getDashboard,
  updateProfile,
  updateAvailability,
  getBookings as getFreelancerBookings,
  getNotifications,
  markNotificationAsRead,
  getChats as getFreelancerChats,
  getChatMessages as getFreelancerChatMessages,
  deleteFreelancerChat,
  deleteFreelancerMessage
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
  updateUserPreferences,
  getChats as getClientChats,
  deleteClientChat,
  deleteClientMessage
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
router.get('/admin/users', adminSessionAuth, getAllUsers);

// New admin routes using the admin controller
router.delete('/admin/users/:id', adminSessionAuth, deleteUser);
router.delete('/admin/freelancers/:id', adminSessionAuth, deleteFreelancer);
router.patch('/admin/users/:id/promote', adminSessionAuth, promoteToAdmin);
router.patch('/admin/users/:id/revoke', adminSessionAuth, revokeAdmin);

// Legacy endpoint to fix roles for a specific user
router.get('/admin/fix-role/:id', adminSessionAuth, async (req, res) => {
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

// User data endpoint (for client names in chats)
router.get('/users', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const allUsers = await storage.getAllUsers();
    
    // Return only the necessary fields for display
    const usersResponse = allUsers.map(user => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username || `User ${user.id}`,
      photoURL: user.photoURL || null,
      isClient: user.isClient
    }));
    
    return res.json(usersResponse);
  } catch (error) {
    console.error('Error fetching all users:', error);
    return res.status(500).json({ message: 'Error fetching user data' });
  }
});

// Auth routes
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/freelancer-profile', requireAuth, createFreelancerProfile);
router.get('/auth/me', requireAuth, getCurrentUser);
router.patch('/auth/profile', requireAuth, updateUserProfile);
router.post('/auth/logout', logout);

// Chat routes
router.post('/chat/message', requireAuth, sendMessage);
router.post('/chat/direct-message', requireAuth, sendDirectMessage);
router.post('/chat/init', requireAuth, initChat);

// AI routes
router.get('/ai/status', checkAIStatus); // No authentication needed to check AI status
router.post('/ai/message', processAIMessage); // Removed requireAuth in development mode
router.post('/ai/job-analysis', processJobRequest); // Removed requireAuth to allow non-authenticated use

// Ollama routes (using a separate router)
router.use('/ollama', ollamaRouter);

// Ollama testing routes (no auth required)
router.use('/test-ollama', testOllamaRouter);

// These imports are already at the top of the file
// No need to import them again

// Public freelancer routes (no auth required for AI job matching)
router.get('/freelancers', async (req, res) => {
  try {
    // Get all freelancers
    const allFreelancers = await storage.getAllFreelancers();
    
    // Return a list of public-facing information with actual display names
    const freelancersResponse = await Promise.all(allFreelancers.map(async (freelancer) => {
      // Get the user data to access the display name
      const user = await storage.getUser(freelancer.userId);
      
      // Use the utility function to extract the appropriate name
      const displayName = extractFreelancerName(freelancer, user);
      
      return {
        id: freelancer.id,
        userId: freelancer.userId,
        displayName: displayName,
        profession: freelancer.profession,
        skills: freelancer.skills,
        bio: freelancer.bio,
        hourlyRate: freelancer.hourlyRate,
        yearsOfExperience: freelancer.yearsOfExperience,
        location: freelancer.location,
        imageUrl: freelancer.imageUrl,
        // Handle ratings correctly - we don't want the frontend to divide by 10
        // For the seeded freelancers, we'll multiply their ratings to match the expected scale
        rating: freelancer.rating !== null && typeof freelancer.rating === 'number'
          ? (freelancer.rating <= 5 ? freelancer.rating * 10 : freelancer.rating)
          : null, // Keep ratings as null if they're null
        jobPerformance: freelancer.jobPerformance,
        // Include availability info
        availability: freelancer.availability,
        availabilityDetails: freelancer.availabilityDetails,
        skillsExperience: freelancer.skillsExperience,
        responsiveness: freelancer.responsiveness,
        fairnessScore: freelancer.fairnessScore,
        completedJobs: freelancer.completedJobs
      };
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
    
    // Get the user to access the display name
    const user = await storage.getUser(freelancer.userId);
    
    // Use the utility function to extract the appropriate name
    const displayName = extractFreelancerName(freelancer, user);
    
    // Return public-facing information with actual display name
    return res.json({
      id: freelancer.id,
      userId: freelancer.userId,
      displayName: displayName,
      profession: freelancer.profession,
      skills: freelancer.skills,
      bio: freelancer.bio,
      hourlyRate: freelancer.hourlyRate,
      yearsOfExperience: freelancer.yearsOfExperience,
      location: freelancer.location,
      imageUrl: freelancer.imageUrl,
      // Handle ratings correctly - we don't want the frontend to divide by 10
      // For the seeded freelancers, we'll multiply their ratings to match the expected scale
      rating: freelancer.rating !== null && typeof freelancer.rating === 'number'
        ? (freelancer.rating <= 5 ? freelancer.rating * 10 : freelancer.rating)
        : null, // Keep ratings as null if they're null
      jobPerformance: freelancer.jobPerformance,
      skillsExperience: freelancer.skillsExperience,
      responsiveness: freelancer.responsiveness,
      fairnessScore: freelancer.fairnessScore,
      completedJobs: freelancer.completedJobs,
      // Include availability info
      availability: freelancer.availability,
      availabilityDetails: freelancer.availabilityDetails
    });
  } catch (error) {
    console.error('Error fetching freelancer:', error);
    return res.status(500).json({ message: 'Error fetching freelancer data' });
  }
});

// Get reviews for a specific freelancer
router.get('/freelancers/:id/reviews', async (req, res) => {
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
    
    // Get all reviews for this freelancer
    const reviews = await storage.getReviewsByFreelancerId(id);
    
    // Fetch client information for each review
    const reviewsWithClientInfo = await Promise.all(reviews.map(async (review) => {
      const client = await storage.getUser(review.clientId);
      return {
        ...review,
        client: client ? {
          username: client.username,
          displayName: client.displayName,
          photoURL: client.photoURL
        } : undefined
      };
    }));
    
    return res.json({
      freelancerId: id,
      reviews: reviewsWithClientInfo
    });
  } catch (error) {
    console.error('Error fetching freelancer reviews:', error);
    return res.status(500).json({ message: 'Error fetching reviews' });
  }
});

// Freelancer routes
router.get('/freelancer/dashboard', requireFreelancer, getDashboard);
router.patch('/freelancer/profile', requireFreelancer, updateProfile);
router.patch('/freelancer/availability', requireFreelancer, updateAvailability);
router.get('/freelancer/job-requests', requireFreelancer, jobRequestController.getFreelancerJobRequests);
router.patch('/freelancer/job-requests/:id', requireFreelancer, jobRequestController.updateJobRequestStatus);
router.get('/freelancer/bookings', requireFreelancer, getFreelancerBookings);
router.get('/freelancer/notifications', requireFreelancer, getNotifications);
router.patch('/freelancer/notifications/:id', requireFreelancer, markNotificationAsRead);
router.get('/freelancer/chats', requireFreelancer, getFreelancerChats);
router.get('/freelancer/chats/:chatId/messages', requireFreelancer, getFreelancerChatMessages);
router.delete('/freelancer/chats/:chatId', requireFreelancer, deleteFreelancerChat);
router.delete('/freelancer/messages/:messageId', requireFreelancer, deleteFreelancerMessage);

// Client routes
router.post('/client/job-requests', requireClient, createJobRequest);
router.get('/client/job-requests', requireClient, getClientJobRequests);
router.get('/client/bookings', requireClient, getClientBookings);
router.post('/client/bookings', requireClient, createBooking);
router.get('/client/availability', requireClient, checkFreelancerAvailability);
router.post('/client/reviews', requireClient, createReview);
router.get('/client/chats', requireClient, getClientChats);
router.get('/client/chats/:chatId/messages', requireClient, getChatMessages);
router.delete('/client/chats/:chatId', requireClient, deleteClientChat);
router.delete('/client/messages/:messageId', requireClient, deleteClientMessage);
router.get('/client/preferences', requireClient, getUserPreferences);
router.post('/client/preferences', requireClient, updateUserPreferences);

// Note: Routes for /freelancers and /freelancers/:id are already defined above (lines 161-253)
// Removing duplicates here to prevent conflicts

export default router;