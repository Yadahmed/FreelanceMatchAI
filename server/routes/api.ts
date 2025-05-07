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

// Add a debug endpoint to fix role issues
router.get('/debug/fix-role/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);
    
    // Import the storage from the parent file
    const { storage } = require('../storage');
    
    // Get the current user
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get freelancer to check if this user has a freelancer profile
    const freelancer = await storage.getFreelancerByUserId(userId);
    
    console.log('Debug - Current user state:', { 
      userId, 
      isClient: user.isClient,
      hasFreelancerProfile: !!freelancer 
    });
    
    // If user has a freelancer profile but isClient is true, fix it
    if (freelancer && user.isClient) {
      console.log('Debug - Fixing user role. Changing isClient from true to false');
      const updatedUser = await storage.updateUser(userId, { isClient: false });
      return res.status(200).json({ 
        message: 'User role fixed',
        before: { isClient: true },
        after: { isClient: updatedUser.isClient }
      });
    }
    
    return res.status(200).json({ 
      message: 'User role check completed',
      user: { id: user.id, username: user.username, isClient: user.isClient },
      hasFreelancerProfile: !!freelancer
    });
  } catch (error) {
    console.error('Role fix error:', error);
    return res.status(500).json({ message: 'Error fixing role' });
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