import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from "zod";
import { eq } from 'drizzle-orm';

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
    
    // Calculate total earnings from completed jobs
    const completedJobs = jobRequests.filter(job => job.status === 'completed');
    const totalEarnings = completedJobs.reduce((sum, job) => {
      // Make sure to only add valid numeric budget amounts
      return sum + (typeof job.budget === 'number' ? job.budget : 0);
    }, 0);
    
    // Calculate this month's earnings
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthJobs = completedJobs.filter(job => {
      const completedDate = new Date(job.updatedAt);
      return completedDate >= startOfMonth;
    });
    const thisMonthEarnings = thisMonthJobs.reduce((sum, job) => {
      return sum + (typeof job.budget === 'number' ? job.budget : 0);
    }, 0);
    
    // Get reviews
    const reviews = await storage.getReviewsByFreelancerId(freelancer.id);
    
    // Calculate average rating
    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0;
    
    // Calculate match score from performance metrics
    const jobPerformance = freelancer.jobPerformance || 0;
    const skillsExperience = freelancer.skillsExperience || 0;
    const responsiveness = freelancer.responsiveness || 0;
    const fairnessScore = freelancer.fairnessScore || 0;
    
    // Calculate weighted match score (0-100)
    const matchScore = Math.round(
      jobPerformance * 0.40 +       // 40% weight
      skillsExperience * 0.30 +     // 30% weight  
      responsiveness * 0.20 +       // 20% weight
      fairnessScore * 0.10          // 10% weight
    );
    
    // Add match score to freelancer object for frontend to use
    const enhancedFreelancer = {
      ...freelancer,
      calculatedMatchScore: matchScore
    };
    
    return res.status(200).json({
      freelancer: enhancedFreelancer,
      stats: {
        pendingRequests,
        acceptedRequests,
        completedRequests,
        totalRequests,
        averageRating,
        completedJobsCount: freelancer.completedJobs,
        matchScore: matchScore,
        totalEarnings,
        thisMonthEarnings
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

// Validate availability details
const availabilityDetailsSchema = z.object({
  status: z.enum(['available', 'unavailable', 'limited']),
  message: z.string().optional(),
  availableFrom: z.string().optional(),
  availableUntil: z.string().optional(),
  workHours: z.object({
    start: z.string(),
    end: z.string()
  }).optional(),
  workDays: z.array(z.number().min(0).max(6)).optional()
});

// Update freelancer availability
export async function updateAvailability(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Only freelancers can update their availability
    if (req.user.isClient) {
      return res.status(403).json({ message: 'Freelancer access required' });
    }
    
    // Find the freelancer profile
    const freelancer = await storage.getFreelancerByUserId(req.user.id);
    
    if (!freelancer) {
      return res.status(404).json({ message: 'Freelancer profile not found' });
    }
    
    // Validate the availability data
    const { status, message, availableFrom, availableUntil, workHours, workDays } = availabilityDetailsSchema.parse(req.body);
    
    // Prepare the update data
    const updateData = {
      availability: status === 'available',
      availabilityDetails: {
        status,
        message: message || '',
        availableFrom: availableFrom || '',
        availableUntil: availableUntil || '',
        workHours: workHours || { start: '09:00', end: '17:00' },
        workDays: workDays || [1, 2, 3, 4, 5], // Monday to Friday by default
        lastUpdated: new Date().toISOString()
      }
    };
    
    // Update freelancer availability
    const updatedFreelancer = await storage.updateFreelancer(freelancer.id, updateData);
    
    return res.status(200).json({
      message: 'Availability updated successfully',
      profile: updatedFreelancer
    });
  } catch (error: any) {
    console.error('Freelancer availability update error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid availability data', errors: error.errors });
    }
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
        
        // Default time slots (9-10 AM)
        let startTime = '09:00:00'; 
        let endTime = '10:00:00';
        
        // Check if the default slot is already booked
        const hasTimeConflict = existingBookings.some(booking => 
          booking.date === formattedDate && 
          ((booking.startTime <= startTime && booking.endTime > startTime) ||
           (booking.startTime < endTime && booking.endTime >= endTime) ||
           (booking.startTime >= startTime && booking.endTime <= endTime))
        );
        
        // If there's a conflict, try to find the next available slot
        if (hasTimeConflict) {
          // Try slots from 8AM to 5PM
          const timeSlots = [
            { start: '08:00:00', end: '09:00:00' },
            { start: '10:00:00', end: '11:00:00' },
            { start: '11:00:00', end: '12:00:00' },
            { start: '13:00:00', end: '14:00:00' },
            { start: '14:00:00', end: '15:00:00' },
            { start: '15:00:00', end: '16:00:00' },
            { start: '16:00:00', end: '17:00:00' },
          ];
          
          // Find the first available slot
          const availableSlot = timeSlots.find(slot => {
            return !existingBookings.some(booking => 
              booking.date === formattedDate && 
              ((booking.startTime <= slot.start && booking.endTime > slot.start) ||
               (booking.startTime < slot.end && booking.endTime >= slot.end) ||
               (booking.startTime >= slot.start && booking.endTime <= slot.end))
            );
          });
          
          // Use the available slot or stick with default if nothing is available
          if (availableSlot) {
            startTime = availableSlot.start;
            endTime = availableSlot.end;
          }
        }
        
        const booking = await storage.createBooking({
          freelancerId: freelancer.id,
          clientId: jobRequest.clientId,
          jobRequestId: jobRequest.id,
          title: jobRequest.title,
          description: jobRequest.description,
          date: formattedDate,
          startTime: startTime,
          endTime: endTime,
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
      
      // Get client user information to include with the chat
      let client = null;
      if (chat.userId) {
        client = await storage.getUser(chat.userId);
      }
      
      return {
        ...chat,
        latestMessage,
        relatedJobRequest: relatedJobRequest || null,
        messageCount: messages.length,
        client: client ? {
          id: client.id,
          username: client.username,
          displayName: client.displayName,
          photoURL: client.photoURL
        } : null
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
    // For security, check if the chat belongs to this user directly,
    // or if the freelancer is the recipient of the chat,
    // or if the freelancer is mentioned in any message in this chat
    
    // Get the freelancer profile
    const freelancer = await storage.getFreelancerByUserId(req.user.id);
    
    if (!freelancer) {
      return res.status(404).json({ message: 'Freelancer profile not found' });
    }
    
    // Check if this is a direct message chat to this freelancer
    const isRecipient = chat.freelancerId === freelancer.id;
    
    // If the user doesn't own the chat and is not the recipient
    if (chat.userId !== req.user.id && !isRecipient) {
      // Check if the freelancer is mentioned in results as a fallback
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
    
    console.log('Freelancer access granted to chat:', chat.id, 'Freelancer ID:', freelancer.id);
    
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

// Delete a chat (for freelancers)
export async function deleteFreelancerChat(req: Request, res: Response) {
  try {
    console.log('deleteFreelancerChat called with params:', req.params);
    console.log('User in request:', req.user ? `ID: ${req.user.id}, isClient: ${req.user.isClient}` : 'No user');
    
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Only freelancers can delete their chats
    if (req.user.isClient) {
      return res.status(403).json({ message: 'Freelancer access required' });
    }
    
    const { chatId } = req.params;
    console.log('Chat ID from params:', chatId);
    
    if (!chatId) {
      return res.status(400).json({ message: 'Chat ID is required' });
    }
    
    // Find freelancer profile
    const freelancer = await storage.getFreelancerByUserId(req.user.id);
    console.log('Freelancer found:', freelancer ? `ID: ${freelancer.id}` : 'Not found');
    
    if (!freelancer) {
      return res.status(404).json({ message: 'Freelancer profile not found' });
    }
    
    // Get chat and verify the freelancer is part of this chat
    const chat = await storage.getChat(parseInt(chatId));
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check if this freelancer is part of this chat
    // Allow deletion if the chat has this freelancer's ID or if the user is the one who created the chat
    if (chat.freelancerId !== freelancer.id && chat.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this chat' });
    }
    
    console.log('Authorization check passed for chat:', chatId, 'Freelancer ID:', freelancer.id);
    
    // Delete the chat (which will also delete all messages within it)
    const deleted = await storage.deleteChat(parseInt(chatId));
    
    if (!deleted) {
      return res.status(500).json({ message: 'Failed to delete chat' });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Chat deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete freelancer chat error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Delete a message (for freelancers)
export async function deleteFreelancerMessage(req: Request, res: Response) {
  try {
    console.log('deleteFreelancerMessage called with params:', req.params);
    console.log('User in request:', req.user ? `ID: ${req.user.id}, isClient: ${req.user.isClient}` : 'No user');
    
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Only freelancers can delete their messages
    if (req.user.isClient) {
      return res.status(403).json({ message: 'Freelancer access required' });
    }
    
    const { messageId } = req.params;
    console.log('Message ID from params:', messageId);
    
    if (!messageId) {
      return res.status(400).json({ message: 'Message ID is required' });
    }
    
    // Find freelancer profile
    const freelancer = await storage.getFreelancerByUserId(req.user.id);
    console.log('Freelancer found:', freelancer ? `ID: ${freelancer.id}` : 'Not found');
    
    if (!freelancer) {
      return res.status(404).json({ message: 'Freelancer profile not found' });
    }
    
    // Get the message
    const message = await storage.getMessage(parseInt(messageId));
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Get the chat to verify ownership
    const chat = await storage.getChat(message.chatId);
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check if this chat belongs to this freelancer and message isn't user-sent
    if (chat.freelancerId !== freelancer.id) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }
    
    // We should only let freelancers delete their own messages (non-user messages)
    if (message.isUserMessage) {
      return res.status(403).json({ message: 'Cannot delete client messages' });
    }
    
    console.log('Authorization check passed for message:', messageId, 'Freelancer ID:', freelancer.id);
    
    // Delete the message
    const deleted = await storage.deleteMessage(parseInt(messageId));
    
    if (!deleted) {
      return res.status(500).json({ message: 'Failed to delete message' });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete freelancer message error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}