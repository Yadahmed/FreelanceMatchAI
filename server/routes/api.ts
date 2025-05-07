import { Router } from 'express';
import * as authController from '../controllers/authController';
import * as freelancerController from '../controllers/freelancerController';
import * as clientController from '../controllers/clientController';
import { authenticateUser, requireAuth, requireClient, requireFreelancer } from '../middleware/auth';

const apiRouter = Router();

// Apply authentication middleware to all routes
apiRouter.use(authenticateUser);

// Auth routes
apiRouter.post('/auth/register', authController.register);
apiRouter.post('/auth/login', authController.login);
apiRouter.get('/auth/me', requireAuth, authController.getCurrentUser);
apiRouter.post('/auth/logout', authController.logout);
apiRouter.post('/auth/freelancer-profile', requireAuth, authController.createFreelancerProfile);

// Freelancer routes
apiRouter.get('/freelancer/dashboard', requireFreelancer, freelancerController.getDashboard);
apiRouter.put('/freelancer/profile', requireFreelancer, freelancerController.updateProfile);
apiRouter.get('/freelancer/job-requests', requireFreelancer, freelancerController.getJobRequests);
apiRouter.put('/freelancer/job-requests/:id', requireFreelancer, freelancerController.updateJobRequestStatus);
apiRouter.get('/freelancer/bookings', requireFreelancer, freelancerController.getBookings);
apiRouter.put('/freelancer/bookings/:id', requireFreelancer, freelancerController.updateBooking);
apiRouter.get('/freelancer/notifications', requireFreelancer, freelancerController.getNotifications);
apiRouter.put('/freelancer/notifications/:id', requireFreelancer, freelancerController.markNotificationAsRead);

// Client routes
apiRouter.post('/client/job-requests', requireClient, clientController.createJobRequest);
apiRouter.get('/client/job-requests', requireClient, clientController.getJobRequests);
apiRouter.get('/client/bookings', requireClient, clientController.getBookings);
apiRouter.post('/client/reviews', requireClient, clientController.createReview);
apiRouter.get('/client/chats', requireClient, clientController.getChatHistory);
apiRouter.get('/client/chats/:chatId/messages', requireClient, clientController.getChatMessages);
apiRouter.get('/client/preferences', requireClient, clientController.getUserPreferences);
apiRouter.put('/client/preferences', requireClient, clientController.updateUserPreferences);

// Existing chat and other routes should be added here

export default apiRouter;