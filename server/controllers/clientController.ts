import { Request, Response } from 'express';
import { storage } from '../storage';
import { extractFreelancerName } from '../utils/freelancer';

// Create a job request
export async function createJobRequest(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Only clients can create job requests
    if (!req.user.isClient) {
      return res.status(403).json({ message: 'Client access required' });
    }
    
    const { freelancerId, title, description, budget } = req.body;
    
    if (!freelancerId || !title || !description) {
      return res.status(400).json({ message: 'Freelancer ID, title, and description are required' });
    }
    
    // Validate freelancer exists
    const freelancer = await storage.getFreelancer(freelancerId);
    
    if (!freelancer) {
      return res.status(404).json({ message: 'Freelancer not found' });
    }
    
    // Create job request
    const jobRequest = await storage.createJobRequest({
      clientId: req.user.id,
      freelancerId,
      title,
      description,
      budget: budget || null,
      status: 'pending'
    });
    
    // Create notification for freelancer
    await storage.createNotification({
      userId: freelancer.userId,
      title: 'New Job Request',
      content: `You have received a new job request: "${title}"`,
      type: 'job_request',
      relatedId: jobRequest.id
    });
    
    return res.status(201).json({
      message: 'Job request created successfully',
      jobRequest
    });
  } catch (error: any) {
    console.error('Create job request error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Get job requests for a client
export async function getJobRequests(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Only clients can view their job requests
    if (!req.user.isClient) {
      return res.status(403).json({ message: 'Client access required' });
    }
    
    // Get job requests
    const jobRequests = await storage.getJobRequestsByClientId(req.user.id);
    
    // Get freelancer details for each job request
    const jobRequestsWithFreelancers = await Promise.all(
      jobRequests.map(async (request) => {
        const freelancer = await storage.getFreelancer(request.freelancerId);
        return {
          ...request,
          freelancer
        };
      })
    );
    
    return res.status(200).json({ jobRequests: jobRequestsWithFreelancers });
  } catch (error: any) {
    console.error('Get job requests error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Get bookings for a client
export async function getBookings(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Only clients can view their bookings
    if (!req.user.isClient) {
      return res.status(403).json({ message: 'Client access required' });
    }
    
    // Get bookings
    const bookings = await storage.getBookingsByClientId(req.user.id);
    
    // Get freelancer details for each booking
    const bookingsWithFreelancers = await Promise.all(
      bookings.map(async (booking) => {
        const freelancer = await storage.getFreelancer(booking.freelancerId);
        return {
          ...booking,
          freelancer
        };
      })
    );
    
    return res.status(200).json({ bookings: bookingsWithFreelancers });
  } catch (error: any) {
    console.error('Get bookings error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Create a review for a freelancer
export async function createReview(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Only clients can create reviews
    if (!req.user.isClient) {
      return res.status(403).json({ message: 'Client access required' });
    }
    
    const { freelancerId, jobRequestId, rating, comment } = req.body;
    
    if (!freelancerId || !rating) {
      return res.status(400).json({ message: 'Freelancer ID and rating are required' });
    }
    
    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    
    // Validate freelancer exists
    const freelancer = await storage.getFreelancer(freelancerId);
    
    if (!freelancer) {
      return res.status(404).json({ message: 'Freelancer not found' });
    }
    
    // If job request ID provided, validate it exists and belongs to this client
    if (jobRequestId) {
      const jobRequest = await storage.getJobRequest(jobRequestId);
      
      if (!jobRequest) {
        return res.status(404).json({ message: 'Job request not found' });
      }
      
      if (jobRequest.clientId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to review this job request' });
      }
      
      // Check if job request is completed
      if (jobRequest.status !== 'completed') {
        return res.status(400).json({ message: 'Cannot review a job request that is not completed' });
      }
    }
    
    // Create review
    const review = await storage.createReview({
      clientId: req.user.id,
      freelancerId,
      jobRequestId: jobRequestId || null,
      rating,
      comment: comment || null
    });
    
    // Get all reviews for this freelancer to calculate new average rating
    const allReviews = await storage.getReviewsByFreelancerId(freelancerId);
    
    // Calculate new average rating (stored as an integer 0-50, where 45 = 4.5 stars)
    const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = Math.round((totalRating / allReviews.length) * 10); // Convert 1-5 to 10-50
    
    // Update the freelancer's rating
    await storage.updateFreelancerRating(freelancerId, averageRating);
    
    // Create notification for freelancer
    await storage.createNotification({
      userId: freelancer.userId,
      title: 'New Review',
      content: `You have received a new ${rating}-star review`,
      type: 'review',
      relatedId: review.id
    });
    
    return res.status(201).json({
      message: 'Review created successfully',
      review
    });
  } catch (error: any) {
    console.error('Create review error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Get chat history
export async function getChatHistory(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Get all chats for this user
    const chats = await storage.getChatsByUserId(req.user.id);
    
    // Get messages for the most recent chat
    let messages: ReturnType<typeof storage.getMessagesByChatId> extends Promise<infer T> ? T : never = [];
    if (chats.length > 0) {
      const mostRecentChat = chats[0]; // Assuming chats are sorted by updated_at
      messages = await storage.getMessagesByChatId(mostRecentChat.id);
    }
    
    return res.status(200).json({
      chats,
      messages
    });
  } catch (error: any) {
    console.error('Get chat history error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Get messages for a specific chat
export async function getChatMessages(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
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
    
    // Verify chat belongs to this user
    if (chat.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to access this chat' });
    }
    
    // Get messages
    const messages = await storage.getMessagesByChatId(chat.id);
    
    return res.status(200).json({ messages });
  } catch (error: any) {
    console.error('Get chat messages error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Get user preferences
export async function getUserPreferences(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Get preferences
    const preferences = await storage.getUserPreferences(req.user.id);
    
    return res.status(200).json({ preferences: preferences || null });
  } catch (error: any) {
    console.error('Get user preferences error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Update user preferences
export async function updateUserPreferences(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const { 
      preferredProfessions, 
      preferredSkills, 
      preferredLocations, 
      maxHourlyRate, 
      minYearsExperience 
    } = req.body;
    
    // Create or update preferences
    const preferences = await storage.createOrUpdateUserPreferences({
      userId: req.user.id,
      preferredProfessions: preferredProfessions || [],
      preferredSkills: preferredSkills || [],
      preferredLocations: preferredLocations || [],
      maxHourlyRate: maxHourlyRate || null,
      minYearsExperience: minYearsExperience || null
    });
    
    return res.status(200).json({
      message: 'Preferences updated successfully',
      preferences
    });
  } catch (error: any) {
    console.error('Update user preferences error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Create a booking directly without going through the job request workflow
// Check freelancer availability before making a booking
export async function checkFreelancerAvailability(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const { freelancerId, date } = req.query;
    
    if (!freelancerId || !date) {
      return res.status(400).json({ message: 'Freelancer ID and date are required' });
    }
    
    // Validate date format (YYYY-MM-DD)
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(date as string)) {
      return res.status(400).json({ message: 'Invalid date format. Please use YYYY-MM-DD' });
    }
    
    // Verify freelancer exists
    const freelancer = await storage.getFreelancer(parseInt(freelancerId as string));
    if (!freelancer) {
      return res.status(404).json({ message: 'Freelancer not found' });
    }
    
    // Get all bookings for this freelancer on the specified date
    const allBookings = await storage.getBookingsByFreelancerId(freelancer.id);
    const dateBookings = allBookings.filter(booking => booking.date === date);
    
    // Create an array of busy time slots
    const busyTimeSlots = dateBookings.map(booking => ({
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status
    }));
    
    // Create an array of available time slots (9 AM to 5 PM, hourly slots)
    const timeSlots = [
      { start: '08:00:00', end: '09:00:00' },
      { start: '09:00:00', end: '10:00:00' },
      { start: '10:00:00', end: '11:00:00' },
      { start: '11:00:00', end: '12:00:00' },
      { start: '13:00:00', end: '14:00:00' },
      { start: '14:00:00', end: '15:00:00' },
      { start: '15:00:00', end: '16:00:00' },
      { start: '16:00:00', end: '17:00:00' },
    ];
    
    const availableTimeSlots = timeSlots.filter(slot => {
      // Check if this slot conflicts with any booking
      return !busyTimeSlots.some(booking => 
        (slot.start <= booking.startTime && slot.end > booking.startTime) ||
        (slot.start < booking.endTime && slot.end >= booking.endTime) ||
        (slot.start >= booking.startTime && slot.end <= booking.endTime)
      );
    });
    
    return res.status(200).json({
      freelancer: {
        id: freelancer.id,
        profession: freelancer.profession,
        hourlyRate: freelancer.hourlyRate
      },
      date: date,
      busyTimeSlots,
      availableTimeSlots
    });
  } catch (error: any) {
    console.error('Check availability error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

export async function createBooking(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Only clients can create bookings
    if (!req.user.isClient) {
      return res.status(403).json({ message: 'Client access required' });
    }
    
    const { 
      freelancerId, 
      date, 
      startTime, 
      endTime, 
      title,
      description
    } = req.body;
    
    // Basic validation
    if (!freelancerId || !date || !startTime || !endTime || !title) {
      return res.status(400).json({ 
        message: 'Freelancer ID, date, start time, end time, and title are required' 
      });
    }
    
    // Validate date format (YYYY-MM-DD)
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(date)) {
      return res.status(400).json({ message: 'Invalid date format. Please use YYYY-MM-DD' });
    }
    
    // Validate time format (HH:MM:SS)
    const timePattern = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
    if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
      return res.status(400).json({ message: 'Invalid time format. Please use HH:MM:SS' });
    }
    
    // Check if end time is after start time
    if (startTime >= endTime) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }
    
    // Verify freelancer exists
    const freelancer = await storage.getFreelancer(freelancerId);
    if (!freelancer) {
      return res.status(404).json({ message: 'Freelancer not found' });
    }
    
    // Check for conflicting bookings
    const existingBookings = await storage.getBookingsByFreelancerId(freelancerId);
    
    const hasConflict = existingBookings.some(booking => 
      booking.date === date && 
      ((booking.startTime <= startTime && booking.endTime > startTime) ||
       (booking.startTime < endTime && booking.endTime >= endTime) ||
       (booking.startTime >= startTime && booking.endTime <= endTime))
    );
    
    if (hasConflict) {
      return res.status(409).json({ 
        message: 'Time slot is already booked. Please select a different time.' 
      });
    }
    
    // Create booking
    const booking = await storage.createBooking({
      clientId: req.user.id,
      freelancerId,
      title,
      description: description || null,
      date,
      startTime,
      endTime,
      status: 'pending',
      jobRequestId: null // Direct booking, not from a job request
    });
    
    // Create notification for freelancer
    await storage.createNotification({
      userId: freelancer.userId,
      title: 'New Booking Request',
      content: `You have a new booking request: "${title}" on ${date} from ${startTime} to ${endTime}`,
      type: 'booking_request',
      relatedId: booking.id
    });
    
    return res.status(201).json({
      message: 'Booking created successfully. Waiting for freelancer confirmation.',
      booking
    });
  } catch (error: any) {
    console.error('Create booking error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Get all client chats with freelancers
export async function getChats(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Only clients can access this endpoint
    if (!req.user.isClient) {
      return res.status(403).json({ message: 'Client access required' });
    }
    
    console.log('Getting chats for client ID:', req.user.id);
    
    // Get all chats for this client
    const chats = await storage.getChatsByUserId(req.user.id);
    
    // Add the freelancer details to each chat
    const enhancedChats = await Promise.all(
      chats.map(async (chat) => {
        // Skip AI chats (they don't have a freelancerId)
        if (chat.type === 'ai' || !chat.freelancerId) {
          return {
            ...chat,
            freelancer: null,
            latestMessage: null
          };
        }
        
        // Get freelancer details
        const freelancer = await storage.getFreelancer(chat.freelancerId);
        
        // Get the latest message in this chat
        const messages = await storage.getMessagesByChatId(chat.id);
        const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        
        // Create a friendly display name for the freelancer
        let freelancerWithName = freelancer;
        if (freelancer) {
          // Log to debug
          console.log('Freelancer in getChats:', freelancer);
          // Get the user associated with this freelancer directly by userId
          const user = await storage.getUser(freelancer.userId);
          
          // Log to help debug
          console.log('User info for freelancer', freelancer.id, ':', user);
          
          // Determine the best name to display for the freelancer
          let name = "";
          
          // First try to get the display_name from the user record
          if (user?.displayName) {
            name = user.displayName;
          } 
          // Then try username
          else if (user?.username) {
            name = user.username;
          }
          // Otherwise use a hardcoded mapping for known freelancers
          else {
            const knownFreelancers: Record<number, string> = {
              5: "Yawar Jabar",
              6: "Danyar Kamaran", 
              7: "Hamarawa Ali",
              8: "Narmin Khalid",
              9: "Galan Omar",
              27: "Zhina Faraj",
              59: "Mohammed Salim"
            };
            
            name = freelancer.id && freelancer.id in knownFreelancers ? 
              knownFreelancers[freelancer.id] : 
              `Freelancer ${freelancer.id}`;
          }
          
          // Create a new object with freelancer data plus the display name
          // We use type assertion since displayName is not in the Freelancer type
          freelancerWithName = {
            ...freelancer,
            displayName: name
          } as typeof freelancer & { displayName: string };
        }
        
        return {
          ...chat,
          freelancer: freelancerWithName,
          latestMessage
        };
      })
    );
    
    // Sort chats by latest message date (most recent first)
    const sortedChats = enhancedChats.sort((a, b) => {
      // Chats with messages come first
      if (a.latestMessage && !b.latestMessage) return -1;
      if (!a.latestMessage && b.latestMessage) return 1;
      
      // Sort by message timestamp (most recent first)
      if (a.latestMessage && b.latestMessage) {
        // Some messages use createdAt, others use timestamp field
        // We need to handle both timestamp formats
        const aMessage = a.latestMessage as { timestamp?: Date, createdAt?: Date };
        const bMessage = b.latestMessage as { timestamp?: Date, createdAt?: Date };
        
        const aTime = aMessage.createdAt || aMessage.timestamp;
        const bTime = bMessage.createdAt || bMessage.timestamp;
        
        if (!aTime || !bTime) return 0;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      }
      
      // Sort by chat updated_at if no messages
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
    
    return res.status(200).json({
      chats: sortedChats
    });
  } catch (error: any) {
    console.error('Get client chats error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}