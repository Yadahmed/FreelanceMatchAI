import { Request, Response } from 'express';
import { storage } from '../storage';

// Get freelancer dashboard data
export async function getDashboard(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Only freelancers can access the dashboard
    if (req.user.isClient) {
      return res.status(403).json({ message: 'Freelancer access required' });
    }
    
    // Get the freelancer profile
    const freelancer = await storage.getFreelancerByUserId(req.user.id);
    
    if (!freelancer) {
      return res.status(404).json({ message: 'Freelancer profile not found' });
    }
    
    // Get job requests for this freelancer
    const jobRequests = await storage.getJobRequestsByFreelancerId(freelancer.id);
    
    // Get upcoming bookings
    const bookings = await storage.getBookingsByFreelancerId(freelancer.id);
    
    // Get unread notifications
    const notifications = await storage.getUnreadNotifications(req.user.id);
    
    // Calculate completed jobs rate
    const pendingRequests = jobRequests.filter(job => job.status === 'pending').length;
    const acceptedRequests = jobRequests.filter(job => job.status === 'accepted').length;
    const completedRequests = jobRequests.filter(job => job.status === 'completed').length;
    const totalRequests = jobRequests.length;
    
    // Get reviews
    const reviews = await storage.getReviewsByFreelancerId(freelancer.id);
    
    // Calculate average rating
    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0;
    
    return res.status(200).json({
      freelancer,
      stats: {
        pendingRequests,
        acceptedRequests,
        completedRequests,
        totalRequests,
        averageRating,
        completedJobsCount: freelancer.completedJobs
      },
      jobRequests,
      bookings,
      notifications,
      recentReviews: reviews.slice(0, 5) // Just the 5 most recent reviews
    });
  } catch (error: any) {
    console.error('Freelancer dashboard error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Update freelancer profile
export async function updateProfile(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Only freelancers can update their profile
    if (req.user.isClient) {
      return res.status(403).json({ message: 'Freelancer access required' });
    }
    
    // Find the freelancer profile
    const freelancer = await storage.getFreelancerByUserId(req.user.id);
    
    if (!freelancer) {
      return res.status(404).json({ message: 'Freelancer profile not found' });
    }
    
    // Update freelancer profile
    const updatedFreelancer = await storage.updateFreelancer(freelancer.id, req.body);
    
    return res.status(200).json({
      message: 'Profile updated successfully',
      profile: updatedFreelancer
    });
  } catch (error: any) {
    console.error('Freelancer profile update error:', error);
    return res.status(400).json({ message: error.message });
  }
}

// Get job requests for a freelancer
export async function getJobRequests(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Only freelancers can view their job requests
    if (req.user.isClient) {
      return res.status(403).json({ message: 'Freelancer access required' });
    }
    
    // Find the freelancer profile
    const freelancer = await storage.getFreelancerByUserId(req.user.id);
    
    if (!freelancer) {
      return res.status(404).json({ message: 'Freelancer profile not found' });
    }
    
    // Get job requests
    const jobRequests = await storage.getJobRequestsByFreelancerId(freelancer.id);
    
    return res.status(200).json({ jobRequests });
  } catch (error: any) {
    console.error('Get job requests error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Update job request status (accept/decline/complete)
export async function updateJobRequestStatus(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Only freelancers can update job requests
    if (req.user.isClient) {
      return res.status(403).json({ message: 'Freelancer access required' });
    }
    
    const { id } = req.params;
    const { status } = req.body;
    
    if (!id || !status) {
      return res.status(400).json({ message: 'Job request ID and status are required' });
    }
    
    // Validate status
    if (!['accepted', 'declined', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be accepted, declined, or completed' });
    }
    
    // Get the job request
    const jobRequest = await storage.getJobRequest(parseInt(id));
    
    if (!jobRequest) {
      return res.status(404).json({ message: 'Job request not found' });
    }
    
    // Find the freelancer profile
    const freelancer = await storage.getFreelancerByUserId(req.user.id);
    
    if (!freelancer || freelancer.id !== jobRequest.freelancerId) {
      return res.status(403).json({ message: 'Not authorized to update this job request' });
    }
    
    // Update job request status
    const updatedJobRequest = await storage.updateJobRequestStatus(jobRequest.id, status);
    
    // If accepting, create a booking if the job request doesn't already have one
    if (status === 'accepted') {
      // Check if a booking already exists for this job request
      const existingBookings = await storage.getBookingsByFreelancerId(freelancer.id);
      const hasBooking = existingBookings.some(booking => booking.jobRequestId === jobRequest.id);
      
      if (!hasBooking) {
        // Create default booking for the job request
        const oneWeekFromNow = new Date();
        oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
        
        // Format the date as YYYY-MM-DD for the date field
        const formattedDate = oneWeekFromNow.toISOString().split('T')[0];
        
        const booking = await storage.createBooking({
          freelancerId: freelancer.id,
          clientId: jobRequest.clientId,
          jobRequestId: jobRequest.id,
          title: jobRequest.title,
          description: jobRequest.description,
          date: formattedDate,
          startTime: '09:00:00', // Default 9 AM
          endTime: '10:00:00',   // Default 10 AM
          status: 'confirmed'
        });
        
        // Create notification for client
        await storage.createNotification({
          userId: jobRequest.clientId,
          title: 'Booking Confirmed',
          content: `Your job request "${jobRequest.title}" has been accepted and scheduled.`,
          type: 'booking',
          relatedId: booking.id
        });
      }
    }
    
    // If completed, increment the freelancer's completed jobs count
    if (status === 'completed') {
      await storage.updateFreelancer(freelancer.id, {
        completedJobs: freelancer.completedJobs + 1
      });
      
      // Create notification for client
      await storage.createNotification({
        userId: jobRequest.clientId,
        title: 'Job Completed',
        content: `Your job request "${jobRequest.title}" has been marked as completed.`,
        type: 'job_completed',
        relatedId: jobRequest.id
      });
    }
    
    return res.status(200).json({
      message: `Job request ${status} successfully`,
      jobRequest: updatedJobRequest
    });
  } catch (error: any) {
    console.error('Update job request status error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Get bookings for a freelancer
export async function getBookings(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Only freelancers can view their bookings
    if (req.user.isClient) {
      return res.status(403).json({ message: 'Freelancer access required' });
    }
    
    // Find the freelancer profile
    const freelancer = await storage.getFreelancerByUserId(req.user.id);
    
    if (!freelancer) {
      return res.status(404).json({ message: 'Freelancer profile not found' });
    }
    
    // Get bookings
    const bookings = await storage.getBookingsByFreelancerId(freelancer.id);
    
    return res.status(200).json({ bookings });
  } catch (error: any) {
    console.error('Get bookings error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Update booking status function to handle status changes like cancellations
export async function updateBookingStatus(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Only freelancers can update bookings
    if (req.user.isClient) {
      return res.status(403).json({ message: 'Freelancer access required' });
    }
    
    const { id } = req.params;
    const { status } = req.body;
    
    if (!id) {
      return res.status(400).json({ message: 'Booking ID is required' });
    }
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    
    // Get the booking
    const booking = await storage.getBooking(parseInt(id));
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Find the freelancer profile
    const freelancer = await storage.getFreelancerByUserId(req.user.id);
    
    if (!freelancer || freelancer.id !== booking.freelancerId) {
      return res.status(403).json({ message: 'Not authorized to update this booking' });
    }
    
    // Use the storage method to update the booking status
    const updatedBooking = await storage.updateBooking(parseInt(id), { status });
    
    // Create notification for client
    await storage.createNotification({
      userId: booking.clientId,
      title: status === 'cancelled' ? 'Booking Cancelled' : 'Booking Updated',
      content: status === 'cancelled' 
        ? `Your booking "${booking.title}" has been cancelled.`
        : `Your booking "${booking.title}" has been updated.`,
      type: 'booking_update',
      relatedId: booking.id
    });
    
    return res.status(200).json({
      message: status === 'cancelled' ? 'Booking cancelled successfully' : 'Booking updated successfully',
      booking: updatedBooking
    });
  } catch (error: any) {
    console.error('Update booking error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Get notifications for a freelancer
export async function getNotifications(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Get notifications
    const notifications = await storage.getNotifications(req.user.id);
    
    return res.status(200).json({ notifications });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Mark notification as read
export async function markNotificationAsRead(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: 'Notification ID is required' });
    }
    
    // Get the notification
    const notification = await storage.markNotificationAsRead(parseInt(id));
    
    return res.status(200).json({
      message: 'Notification marked as read',
      notification
    });
  } catch (error: any) {
    console.error('Mark notification as read error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Get chat history for a freelancer
export async function getChats(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Only freelancers can access their chats
    if (req.user.isClient) {
      return res.status(403).json({ message: 'Freelancer access required' });
    }
    
    // Find freelancer profile to get freelancer ID
    const freelancer = await storage.getFreelancerByUserId(req.user.id);
    
    if (!freelancer) {
      return res.status(404).json({ message: 'Freelancer profile not found' });
    }
    
    // Get all chats for this freelancer user
    const chats = await storage.getChatsByUserId(req.user.id);
    
    // Get associated job requests for context
    const jobRequests = await storage.getJobRequestsByFreelancerId(freelancer.id);
    
    // Enhance chat data with additional context
    const enhancedChats = await Promise.all(chats.map(async (chat) => {
      // Get the most recent message for each chat
      const messages = await storage.getMessagesByChatId(chat.id);
      const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      
      // Find any job request associated with this chat
      const relatedJobRequest = jobRequests.find(job => 
        messages.some(msg => 
          msg.freelancerResults && 
          Array.isArray(msg.freelancerResults) && 
          msg.freelancerResults.some(f => f.id === freelancer.id)
        )
      );
      
      return {
        ...chat,
        latestMessage,
        relatedJobRequest: relatedJobRequest || null,
        messageCount: messages.length
      };
    }));
    
    return res.status(200).json({
      chats: enhancedChats
    });
  } catch (error: any) {
    console.error('Get freelancer chats error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Get chat messages for a specific chat
export async function getChatMessages(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Only freelancers can access their chat messages
    if (req.user.isClient) {
      return res.status(403).json({ message: 'Freelancer access required' });
    }
    
    const { chatId } = req.params;
    
    if (!chatId) {
      return res.status(400).json({ message: 'Chat ID is required' });
    }
    
    // Get the chat
    const chat = await storage.getChat(parseInt(chatId));
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check if this freelancer is associated with the chat
    // For security, check if the chat belongs to this user
    // or if the freelancer is mentioned in any message in this chat
    
    if (chat.userId !== req.user.id) {
      // If chat doesn't belong to this user directly, check if this freelancer is mentioned in results
      const freelancer = await storage.getFreelancerByUserId(req.user.id);
      
      if (!freelancer) {
        return res.status(404).json({ message: 'Freelancer profile not found' });
      }
      
      // Get all messages from this chat
      const messages = await storage.getMessagesByChatId(chat.id);
      
      // Check if this freelancer is mentioned in any message's results
      const isFreelancerMentioned = messages.some(message => 
        message.freelancerResults && 
        Array.isArray(message.freelancerResults) && 
        message.freelancerResults.some(result => result.id === freelancer.id)
      );
      
      if (!isFreelancerMentioned) {
        return res.status(403).json({ message: 'Not authorized to access this chat' });
      }
    }
    
    // Get messages for this chat
    const messages = await storage.getMessagesByChatId(parseInt(chatId));
    
    return res.status(200).json({
      messages
    });
  } catch (error: any) {
    console.error('Get freelancer chat messages error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}