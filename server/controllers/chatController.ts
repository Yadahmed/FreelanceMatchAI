import { Request, Response } from 'express';
import { chatRequestSchema, directMessageSchema, chatInitSchema, Chat } from '@shared/schema';
import { storage } from '../storage';

// Send a message to the AI assistant
export async function sendMessage(req: Request, res: Response) {
  try {
    // Only authenticated users can send messages
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Parse and validate request
    const { message } = chatRequestSchema.parse(req.body);
    const chatId = req.body.chatId;
    
    // Check if chat exists if chatId is provided
    let currentChatId: number;
    
    if (chatId) {
      const chat = await storage.getChat(chatId);
      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
      }
      
      // Ensure chat belongs to the current user
      if (chat.userId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to access this chat' });
      }
      
      currentChatId = chat.id;
    } else {
      // Create a new chat
      const newChat = await storage.createChat({ userId: req.user.id, type: 'ai' });
      currentChatId = newChat.id;
    }
    
    // Store message as from the user (client)
    const userMessage = await storage.createMessage({
      chatId: currentChatId,
      content: message,
      isUserMessage: true, // Always true for AI chat
      freelancerResults: null
    });
    
    // Process the user message
    let matchedFreelancers = [];
    let responseText = '';
    
    // Get user preferences to personalize recommendations
    const userPreferences = await storage.getUserPreferences(req.user.id);
    
    // Extract keywords from the message
    const messageWords = message.toLowerCase().split(/\\s+/);
    
    // Check for profession keywords
    const professionKeywords = [
      'photographer', 'developer', 'designer', 'writer', 'translator',
      'marketer', 'consultant', 'teacher', 'editor', 'artist'
    ];
    
    // Add user's preferred professions to the keywords list
    if (userPreferences && userPreferences.preferredProfessions) {
      professionKeywords.push(...userPreferences.preferredProfessions);
    }
    
    const foundProfessions = professionKeywords.filter(keyword => 
      messageWords.includes(keyword)
    );
    
    // Check for location keywords
    const locationKeywords = ['erbil', 'remote', 'local'];
    
    // Add user's preferred locations to the keywords list
    if (userPreferences && userPreferences.preferredLocations) {
      locationKeywords.push(...userPreferences.preferredLocations);
    }
    
    const foundLocations = locationKeywords.filter(keyword => 
      messageWords.includes(keyword)
    );
    
    // Check for skill keywords by getting all freelancers and their skills
    const allFreelancers = await storage.getAllFreelancers();
    const allSkills = Array.from(new Set(
      allFreelancers.flatMap(f => f.skills)
    ));
    
    // Add user's preferred skills to the list
    const skillsToCheck = allSkills.slice();
    if (userPreferences && userPreferences.preferredSkills) {
      skillsToCheck.push(...userPreferences.preferredSkills);
    }
    
    const foundSkills = skillsToCheck.filter(skill => 
      messageWords.some(word => skill.toLowerCase().includes(word))
    );
    
    // Determine search strategy based on keywords found and user history
    if (foundProfessions.length > 0) {
      matchedFreelancers = await storage.getFreelancersByProfession(foundProfessions[0]);
      responseText = `Here are the top ${foundProfessions[0]}s I found for you:`;
    } else if (foundSkills.length > 0) {
      matchedFreelancers = await storage.getFreelancersBySkill(foundSkills[0]);
      responseText = `Here are freelancers with ${foundSkills[0]} skills:`;
    } else if (foundLocations.length > 0) {
      matchedFreelancers = await storage.getFreelancersByLocation(foundLocations[0]);
      responseText = `Here are freelancers available in ${foundLocations[0]}:`;
    } else {
      // If no specific keywords found, use user preferences if available
      if (userPreferences) {
        if (userPreferences.preferredProfessions && userPreferences.preferredProfessions.length > 0) {
          matchedFreelancers = await storage.getFreelancersByProfession(userPreferences.preferredProfessions[0]);
          responseText = `Based on your preferences, here are ${userPreferences.preferredProfessions[0]}s you might like:`;
        } else if (userPreferences.preferredSkills && userPreferences.preferredSkills.length > 0) {
          matchedFreelancers = await storage.getFreelancersBySkill(userPreferences.preferredSkills[0]);
          responseText = `Based on your preferences, here are freelancers with ${userPreferences.preferredSkills[0]} skills:`;
        } else if (userPreferences.preferredLocations && userPreferences.preferredLocations.length > 0) {
          matchedFreelancers = await storage.getFreelancersByLocation(userPreferences.preferredLocations[0]);
          responseText = `Based on your preferences, here are freelancers in ${userPreferences.preferredLocations[0]}:`;
        } else {
          // Fall back to top-rated freelancers
          matchedFreelancers = await storage.getTopFreelancersByRanking(3);
          responseText = 'Here are our top-rated freelancers:';
        }
      } else {
        // Default to top freelancers
        matchedFreelancers = await storage.getTopFreelancersByRanking(3);
        responseText = 'Here are our top-rated freelancers:';
      }
    }
    
    // Filter by hourly rate if user has a max rate preference
    if (userPreferences && userPreferences.maxHourlyRate) {
      matchedFreelancers = matchedFreelancers.filter(
        f => f.hourlyRate <= userPreferences.maxHourlyRate!
      );
    }
    
    // Filter by years of experience if user has a min experience preference
    if (userPreferences && userPreferences.minYearsExperience) {
      matchedFreelancers = matchedFreelancers.filter(
        f => (f.yearsOfExperience || 0) >= userPreferences.minYearsExperience!
      );
    }
    
    // Rank and sort freelancers 
    // 1. Get the freelancers with the algorithm weighting
    const rankedFreelancers = matchedFreelancers.map(freelancer => {
      // Calculate match percentage based on algorithm weights
      // Job Performance 50%, Skills & Experience 20%, Responsiveness 15%, Fairness Boost 15%
      const matchScore = Math.round(
        (freelancer.jobPerformance * 0.5) +
        (freelancer.skillsExperience * 0.2) +
        (freelancer.responsiveness * 0.15) +
        (freelancer.fairnessScore * 0.15)
      );
      
      return {
        ...freelancer,
        matchPercentage: Math.min(matchScore, 100)
      };
    });
    
    // 2. Sort by match percentage
    const sortedFreelancers = rankedFreelancers.sort(
      (a, b) => b.matchPercentage! - a.matchPercentage!
    );
    
    // 3. Limit to top 3
    const topFreelancers = sortedFreelancers.slice(0, 3);
    
    // 4. Transform to match the schema with freelancer object
    const formattedFreelancers = await Promise.all(topFreelancers.map(async (freelancer) => {
      // Look up the user to get display name
      const user = await storage.getUser(freelancer.userId);
      const displayName = user?.displayName || user?.username || 'Anonymous Freelancer';
      
      return {
        freelancerId: freelancer.id,
        score: freelancer.matchPercentage || 0,
        matchReasons: ['Strong match based on your requirements'],
        jobPerformanceScore: freelancer.jobPerformance,
        skillsScore: freelancer.skillsExperience,
        responsivenessScore: freelancer.responsiveness,
        fairnessScore: freelancer.fairnessScore,
        // Include the full freelancer object for the UI to use
        freelancer: {
          ...freelancer,
          displayName
        }
      };
    }));
    
    // Create AI response message
    const aiResponseMessage = await storage.createMessage({
      chatId: currentChatId,
      content: responseText,
      isUserMessage: false,
      freelancerResults: formattedFreelancers
    });
    
    // Update user preferences based on this interaction
    if (req.user.isClient && foundProfessions.length > 0) {
      // Update or create preferences
      let currentPreferences = await storage.getUserPreferences(req.user.id);
      
      if (currentPreferences) {
        // Update existing preferences
        const preferredProfessions = new Set([
          ...(currentPreferences.preferredProfessions || []),
          ...foundProfessions
        ]);
        
        await storage.createOrUpdateUserPreferences({
          ...currentPreferences,
          preferredProfessions: Array.from(preferredProfessions)
        });
      } else {
        // Create new preferences
        await storage.createOrUpdateUserPreferences({
          userId: req.user.id,
          preferredProfessions: foundProfessions,
          preferredSkills: foundSkills,
          preferredLocations: foundLocations,
          maxHourlyRate: null,
          minYearsExperience: null
        });
      }
    }
    
    // Format the response to include all necessary data
    return res.status(200).json({
      id: aiResponseMessage.id,
      chatId: currentChatId,
      content: aiResponseMessage.content,
      isUserMessage: false,
      timestamp: aiResponseMessage.timestamp,
      freelancerResults: aiResponseMessage.freelancerResults
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    return res.status(400).json({ message: error.message });
  }
}

// Send a direct message in a chat
// Initialize a chat with a freelancer
export async function initChat(req: Request, res: Response) {
  try {
    // Only authenticated users can create chats
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Parse and validate request
    const { freelancerId } = chatInitSchema.parse(req.body);
    
    // Check if the freelancer exists
    const freelancer = await storage.getFreelancerById(freelancerId);
    if (!freelancer) {
      return res.status(404).json({ message: 'Freelancer not found' });
    }
    
    // Check if a chat already exists between this user and freelancer
    const existingChats = await storage.getChatsByUserId(req.user.id);
    // Type safety: make sure we check for chats that have the right type and freelancerId
    const existingChat = existingChats.find(chat => 
      chat.type === 'direct' && 
      typeof chat.freelancerId === 'number' && 
      chat.freelancerId === freelancerId
    );
    
    if (existingChat) {
      // Return the existing chat
      return res.status(200).json({
        chatId: existingChat.id,
        message: 'Using existing chat'
      });
    }
    
    // Create a new chat
    const newChat = await storage.createChat({ 
      userId: req.user.id, 
      type: 'direct', 
      freelancerId: freelancerId 
    });
    
    return res.status(201).json({
      chatId: newChat.id,
      message: 'Chat initialized successfully'
    });
  } catch (error: any) {
    console.error('Chat initialization error:', error);
    return res.status(400).json({ message: error.message });
  }
}

export async function sendDirectMessage(req: Request, res: Response) {
  try {
    // Only authenticated users can send direct messages
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    console.log('Direct message request body:', req.body);
    
    // Parse and validate request - now freelancerId is optional
    const { message, freelancerId, chatId } = directMessageSchema.parse(req.body);
    
    // Check if chat exists 
    const chat = await storage.getChat(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Determine if user is client or freelancer
    const isClient = req.user.isClient;
    // Initialize with chat's freelancerId (it's non-null since we're dealing with a direct message)
    let currentFreelancerId = chat.freelancerId || 0; // Fallback to 0 in case it's somehow null
    
    if (isClient) {
      // If user is a client, they should own this chat
      if (chat.userId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to access this chat as client' });
      }
    } else {
      // If user is a freelancer, make sure they are the freelancer for this chat
      const userFreelancer = await storage.getFreelancerByUserId(req.user.id);
      
      if (!userFreelancer) {
        return res.status(404).json({ message: 'Freelancer profile not found for user' });
      }
      
      if (userFreelancer.id !== chat.freelancerId) {
        return res.status(403).json({ 
          message: 'Not authorized to access this chat as freelancer',
          yourFreelancerId: userFreelancer.id,
          chatFreelancerId: chat.freelancerId
        });
      }
      
      // Store this for reference
      currentFreelancerId = userFreelancer.id;
    }
    
    // Use the chat ID from the request
    const currentChatId = chatId;
    
    // Store message with correct sender type based on user role
    const userMessage = await storage.createMessage({
      chatId: currentChatId,
      content: message,
      // If it's a client, isUserMessage=true, if it's a freelancer, isUserMessage=false
      isUserMessage: isClient,
      freelancerResults: null
    });
    
    // Create notification based on who's sending the message
    if (isClient) {
      // If client is sending message, notify the freelancer
      // First get the freelancer user ID from the chat's freelancerId
      const freelancerObj = await storage.getFreelancerById(currentFreelancerId);
      if (freelancerObj) {
        await storage.createNotification({
          userId: freelancerObj.userId,
          title: 'New Message',
          content: `You have received a new message from ${req.user.displayName || req.user.username}`,
          type: 'message',
          relatedId: currentChatId
        });
      }
    } else {
      // If freelancer is sending message, notify the client
      await storage.createNotification({
        userId: chat.userId, // The chat owner (client)
        title: 'New Message',
        content: `You have received a new message from your freelancer`,
        type: 'message',
        relatedId: currentChatId
      });
    }
    
    return res.status(200).json({
      chatId: currentChatId,
      message: userMessage
    });
  } catch (error: any) {
    console.error('Direct message error:', error);
    return res.status(400).json({ message: error.message });
  }
}