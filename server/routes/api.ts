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

// Apply authentication middleware to all routes
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