import { Request, Response } from 'express';
import { aiService } from '../services/ai-service';
import { deepseekService } from '../services/deepseek-service';
import { ollamaService } from '../services/ollama-service';
import { anthropicService } from '../services/anthropic-service';
import { storage } from '../storage';
import { aiChatRequestSchema, jobAnalysisRequestSchema } from '@shared/ai-schemas';

/**
 * Helper function to determine if a message is likely requesting freelancer information
 */
function isFreelancerQuery(message: string): boolean {
  const lowerMsg = message.toLowerCase();
  const freelancerKeywords = [
    'developer', 'programmer', 'coder', 'designer', 'freelancer', 
    'translator', 'writer', 'graphic', 'expert', 'professional',
    'web', 'mobile', 'need', 'looking for', 'find', 'hire', 
    'help with', 'skills', 'recommend', 'who can', 'available',
    'based in', 'similar to', 'top rated', 'best', 'marketer',
    'marketing', 'digital marketing', 'social media', 'seo',
    'content creator', 'video editor', 'photographer', 'data', 'scientist',
    'analyst', 'consultant', 'instructor', 'coach', 'tutor', 'teacher'
  ];
  
  // Log the message for debugging
  console.log('[isFreelancerQuery] Checking message:', lowerMsg.slice(0, 50) + '...');
  const isFreelancer = freelancerKeywords.some(keyword => lowerMsg.includes(keyword));
  console.log('[isFreelancerQuery] Result:', isFreelancer);
  
  return isFreelancer;
}

/**
 * Filter and score freelancers based on the user's message
 */
async function getFilteredFreelancers(message: string): Promise<any[]> {
  // Extract important profession and skill keywords from the message
  const professionKeywords = extractProfessionKeywords(message);
  
  console.log(`[AI Matching] Extracted profession keywords: ${professionKeywords.join(', ')}`);
  
  // Get all freelancers to filter
  const allFreelancers = await storage.getAllFreelancers();
  
  // Filter and score freelancers based on the message keywords
  const scoredFreelancers = allFreelancers.map(freelancer => {
    let score = 0;
    const matchReasons = [];
    
    // Get profession match
    const freelancerProfession = (freelancer.profession || '').toLowerCase();
    let professionMatch = false;
    
    for (const keyword of professionKeywords) {
      if (freelancerProfession.includes(keyword)) {
        score += 100; // Much higher score for profession match (increased from 35)
        professionMatch = true;
        matchReasons.push(`Profession matches your request: ${freelancer.profession}`);
        console.log(`[AI Matching] Profession match found: ${freelancer.id} - ${freelancerProfession} matches ${keyword}`);
        break;
      }
    }
    
    // If no direct profession match, check skills
    if (!professionMatch) {
      const freelancerSkills = Array.isArray(freelancer.skills) ? freelancer.skills : [];
      const matchingSkills = freelancerSkills.filter(skill => 
        professionKeywords.some(keyword => 
          skill.toLowerCase().includes(keyword) || keyword.includes(skill.toLowerCase())
        )
      );
      
      if (matchingSkills.length > 0) {
        score += 50;  // Increased from 25 to 50
        matchReasons.push(`Skills match: ${matchingSkills.join(', ')}`);
        console.log(`[AI Matching] Skills match found: ${freelancer.id} - ${matchingSkills.join(', ')}`);
      }
    }
    
    // Add baseline ranking for general quality
    const baselineScore = Math.round(
      (freelancer.jobPerformance * 0.5) +
      (freelancer.skillsExperience * 0.2) +
      (freelancer.responsiveness * 0.15) +
      (freelancer.fairnessScore * 0.15)
    );
    
    // Give MUCH higher priority to profession/skill matches
    score = score > 0 ? 
      Math.round(score * 0.9 + baselineScore * 0.1) : 
      baselineScore;
      
    // Add debug logs
    console.log(`[AI Matching Debug] Freelancer ${freelancer.id} (${freelancer.profession}): content match score=${score}, baseline=${baselineScore}, professionMatch=${professionMatch}`);
    
    return {
      freelancer,
      score,
      matchReasons
    };
  });
  
  // First log all freelancers with their scores
  console.log(`[AI Matching] All ${scoredFreelancers.length} scored freelancers:`);
  scoredFreelancers.forEach(match => {
    console.log(`  ${match.freelancer.id} (${match.freelancer.profession}) - Score: ${match.score} - Reasons: ${match.matchReasons.join(' | ')}`);
  });
  
  // Sort by score and take top 3
  scoredFreelancers.sort((a, b) => b.score - a.score);
  const topMatches = scoredFreelancers.slice(0, 3);
  
  console.log(`[AI Matching] Top 3 matches: ${topMatches.map(m => `${m.freelancer.id} (${m.freelancer.profession}) - Score: ${m.score}`).join(', ')}`);
  
  return topMatches;
}

/**
 * Extract profession-related keywords from a message
 */
function extractProfessionKeywords(message: string): string[] {
  const lowerMsg = message.toLowerCase();
  
  // Define key profession categories and related terms
  const professionMap = {
    'developer': ['developer', 'programmer', 'coder', 'software', 'web dev', 'mobile dev', 'app dev', 'coding'],
    'designer': ['designer', 'design', 'ui', 'ux', 'graphic', 'illustrator', 'photoshop', 'figma'],
    'writer': ['writer', 'content', 'copywriter', 'blog', 'article', 'writing'],
    'translator': ['translator', 'translation', 'language', 'localization'],
    'marketer': ['marketer', 'marketing', 'digital marketer', 'digital marketing', 'social media', 'seo', 'content marketing', 'ads', 'advertising', 'growth hacking', 'growth marketing', 'ppc', 'sem', 'email marketing', 'campaign', 'brand', 'branding', 'social media marketing'],
    'video': ['video', 'editing', 'animation', 'motion graphics', 'filmmaker', 'videographer'],
    'photographer': ['photo', 'photographer', 'photography'],
    'consultant': ['consultant', 'advisor', 'strategy', 'business'],
    'teacher': ['teacher', 'tutor', 'instructor', 'trainer', 'coach'],
    'assistant': ['assistant', 'virtual assistant', 'admin', 'secretary'],
    'data': ['data scientist', 'data analyst', 'data engineer', 'analytics', 'machine learning', 'ml', 'ai', 'artificial intelligence', 'statistics']
  };
  
  const matchedKeywords: string[] = [];
  
  // Check for profession mentions
  for (const [category, terms] of Object.entries(professionMap)) {
    for (const term of terms) {
      if (lowerMsg.includes(term)) {
        // Add both the specific term and the category
        matchedKeywords.push(term);
        if (!matchedKeywords.includes(category)) {
          matchedKeywords.push(category);
        }
      }
    }
  }
  
  // Add common programming languages and technologies if mentioned
  const techKeywords = [
    'javascript', 'react', 'node', 'python', 'django', 'flask',
    'java', 'php', 'laravel', 'wordpress', 'shopify', 'wix',
    'css', 'html', 'typescript', 'angular', 'vue', 'next', 'nuxt',
    'ruby', 'rails', 'golang', 'rust', 'c#', '.net', 'swift',
    'kotlin', 'flutter', 'react native', 'ios', 'android', 'mobile'
  ];
  
  for (const tech of techKeywords) {
    if (lowerMsg.includes(tech)) {
      matchedKeywords.push(tech);
    }
  }
  
  // If we have no matches, extract key nouns from the message
  if (matchedKeywords.length === 0) {
    const words = lowerMsg.split(/\s+/);
    const potentialNouns = words.filter(word => 
      word.length > 3 && 
      !['with', 'this', 'that', 'have', 'from', 'they', 'will', 'what', 'when', 'where', 'your'].includes(word)
    );
    
    // Add the longest words that might be profession-related
    potentialNouns
      .sort((a, b) => b.length - a.length)
      .slice(0, 3)
      .forEach(noun => matchedKeywords.push(noun));
  }
  
  console.log(`[Keyword Extraction] Found keywords in message: ${matchedKeywords.join(', ')}`);
  
  return matchedKeywords;
}

/**
 * Process a message sent to the AI assistant
 */
export async function processAIMessage(req: Request, res: Response) {
  try {
    // Use a default user ID if no authenticated user is found
    // This allows the AI chat to work in development mode without authentication
    const currentUserId = req.user ? req.user.id : 0;
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!req.user && !isDevelopment) {
      console.log('[processAIMessage] No authenticated user found and not in development mode');
      return res.status(401).json({ message: 'Authentication required' });
    }

    console.log('[processAIMessage] User ID:', currentUserId, 'Development mode:', isDevelopment);

    // Validate request body
    const validatedData = aiChatRequestSchema.safeParse(req.body);
    
    if (!validatedData.success) {
      console.log('[processAIMessage] Invalid request data:', validatedData.error);
      return res.status(400).json({ 
        message: 'Invalid request data', 
        errors: validatedData.error.errors 
      });
    }
    
    const { message } = validatedData.data;
    
    console.log('[processAIMessage] Processing message for user:', currentUserId, 'Message length:', message.length);

    // Check if direct metadata is provided (typically for the "improve prompt" feature)
    const metadata = validatedData.data.metadata;
    if (metadata?.direct && metadata?.model) {
      // Try using anthropic first for the "improve prompt" feature
      try {
        console.log('[processAIMessage] Using Anthropic for direct request with model:', metadata.model);
        const anthropicResponse = await anthropicService.sendMessage(currentUserId, message, metadata);
        return res.status(200).json({
          content: anthropicResponse.content,
          metadata: {
            ...anthropicResponse.metadata,
            provider: 'anthropic'
          }
        });
      } catch (anthropicError) {
        console.error('Anthropic direct request error:', anthropicError);
        // Continue to other services if Anthropic fails
      }
    }
    
    // First try DeepSeek service
    const isDeepSeekAvailable = await deepseekService.checkAvailability();
    
    // If DeepSeek is available, use it
    if (isDeepSeekAvailable) {
      try {
        const aiResponse = await deepseekService.sendMessage(currentUserId, message);
        
        // Check if this looks like a freelancer request
        if (isFreelancerQuery(message)) {
          
          // Use our improved matching function to find better freelancer matches
          const topMatches = await getFilteredFreelancers(message);
          
          // Transform to match the schema expected by the UI
          const formattedFreelancers = await Promise.all(topMatches.map(async (match) => {
            // Look up the user to get display name
            const user = await storage.getUser(match.freelancer.userId);
            const displayName = user?.displayName || user?.username || 'Anonymous Freelancer';
            
            // If no specific match reasons, add a generic one
            if (match.matchReasons.length === 0) {
              match.matchReasons.push('Recommended based on overall quality score');
            }
            
            return {
              freelancerId: match.freelancer.id,
              score: match.score,
              matchReasons: match.matchReasons,
              jobPerformanceScore: match.freelancer.jobPerformance,
              skillsScore: match.freelancer.skillsExperience,
              responsivenessScore: match.freelancer.responsiveness,
              fairnessScore: match.freelancer.fairnessScore,
              // Include the full freelancer object for the UI to use
              freelancer: {
                ...match.freelancer,
                displayName
              }
            };
          }));
          
          // Return the response with freelancer results
          return res.status(200).json({
            content: aiResponse.content,
            freelancerResults: formattedFreelancers,
            metadata: {
              ...aiResponse.metadata,
              provider: 'deepseek'
            }
          });
        }
        
        // If not a freelancer query request, just return the standard response
        return res.status(200).json({
          content: aiResponse.content,
          metadata: {
            ...aiResponse.metadata,
            provider: 'deepseek'
          }
        });
      } catch (deepseekError) {
        console.error('DeepSeek service error, trying fallback:', deepseekError);
        // Continue to fallback if DeepSeek fails
      }
    }
    
    // Try Anthropic as next fallback
    const isAnthropicAvailable = await anthropicService.checkAvailability();
    if (isAnthropicAvailable) {
      try {
        console.log('[processAIMessage] Using Anthropic as fallback');
        const anthropicResponse = await anthropicService.sendMessage(currentUserId, message);
        
        // Check if this looks like a freelancer request
        if (isFreelancerQuery(message)) {
          
          // Use our improved matching function to find better freelancer matches
          const topMatches = await getFilteredFreelancers(message);
          
          // Transform to match the schema expected by the UI
          const formattedFreelancers = await Promise.all(topMatches.map(async (match) => {
            // Look up the user to get display name
            const user = await storage.getUser(match.freelancer.userId);
            const displayName = user?.displayName || user?.username || 'Anonymous Freelancer';
            
            // If no specific match reasons, add a generic one
            if (match.matchReasons.length === 0) {
              match.matchReasons.push('Recommended based on overall quality score');
            }
            
            return {
              freelancerId: match.freelancer.id,
              score: match.score,
              matchReasons: match.matchReasons,
              jobPerformanceScore: match.freelancer.jobPerformance,
              skillsScore: match.freelancer.skillsExperience,
              responsivenessScore: match.freelancer.responsiveness,
              fairnessScore: match.freelancer.fairnessScore,
              // Include the full freelancer object for the UI to use
              freelancer: {
                ...match.freelancer,
                displayName
              }
            };
          }));
          
          // Return the response with freelancer results
          return res.status(200).json({
            content: anthropicResponse.content,
            freelancerResults: formattedFreelancers,
            metadata: {
              ...anthropicResponse.metadata,
              provider: 'anthropic',
              fallback: true
            }
          });
        }
        
        // If not a freelancer query, just return the standard response
        return res.status(200).json({
          content: anthropicResponse.content,
          metadata: {
            ...anthropicResponse.metadata,
            provider: 'anthropic',
            fallback: true
          }
        });
      } catch (anthropicError) {
        console.error('Anthropic fallback error:', anthropicError);
        // Continue to next fallback if Anthropic also fails
      }
    }
    
    // Try Ollama as final fallback
    const isOllamaAvailable = await ollamaService.checkAvailability();
    
    if (isOllamaAvailable) {
      try {
        const ollamaResponse = await ollamaService.sendMessage(currentUserId, message);
        
        // Check if this looks like a freelancer request
        if (isFreelancerQuery(message)) {
          
          // Use our improved matching function to find better freelancer matches
          const topMatches = await getFilteredFreelancers(message);
          
          // Transform to match the schema expected by the UI
          const formattedFreelancers = await Promise.all(topMatches.map(async (match) => {
            // Look up the user to get display name
            const user = await storage.getUser(match.freelancer.userId);
            const displayName = user?.displayName || user?.username || 'Anonymous Freelancer';
            
            // If no specific match reasons, add a generic one
            if (match.matchReasons.length === 0) {
              match.matchReasons.push('Recommended based on overall quality score');
            }
            
            return {
              freelancerId: match.freelancer.id,
              score: match.score,
              matchReasons: match.matchReasons,
              jobPerformanceScore: match.freelancer.jobPerformance,
              skillsScore: match.freelancer.skillsExperience,
              responsivenessScore: match.freelancer.responsiveness,
              fairnessScore: match.freelancer.fairnessScore,
              // Include the full freelancer object for the UI to use
              freelancer: {
                ...match.freelancer,
                displayName
              }
            };
          }));
          
          // Return the response with freelancer results
          return res.status(200).json({
            content: ollamaResponse.content,
            freelancerResults: formattedFreelancers,
            metadata: {
              ...ollamaResponse.metadata,
              provider: 'ollama',
              fallback: true
            }
          });
        }
        
        // If not a freelancer query, just return the standard response
        return res.status(200).json({
          content: ollamaResponse.content,
          metadata: {
            ...ollamaResponse.metadata,
            provider: 'ollama',
            fallback: true
          }
        });
      } catch (ollamaError) {
        console.error('Ollama fallback error:', ollamaError);
        // All services failed, return generic error
      }
    }
    
    // If all services are unavailable, return a generic response
    return res.status(500).json({
      content: "I'm sorry, but I'm experiencing technical difficulties at the moment. Please try again later.",
      metadata: {
        provider: 'none',
        error: 'All AI services are unavailable'
      }
    });
    
  } catch (error) {
    console.error('[processAIMessage] Unhandled error:', error);
    return res.status(500).json({ 
      message: 'An unexpected error occurred while processing your message' 
    });
  }
}

/**
 * Check the status of AI services
 */
export async function checkAIStatus(req: Request, res: Response) {
  try {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // In development mode, always return true for the UI to work
    if (isDevelopment) {
      return res.status(200).json({
        available: true,
        servicesOnline: ['deepseek', 'anthropic', 'ollama'],
        developmentMode: true
      });
    }
    
    const deepseekStatus = await deepseekService.checkAvailability();
    const anthropicStatus = await anthropicService.checkAvailability();
    const ollamaStatus = await ollamaService.checkAvailability();
    
    const servicesOnline = [];
    if (deepseekStatus) servicesOnline.push('deepseek');
    if (anthropicStatus) servicesOnline.push('anthropic');
    if (ollamaStatus) servicesOnline.push('ollama');
    
    // System is available if at least one service is online
    const systemAvailable = servicesOnline.length > 0;
    
    return res.status(200).json({
      available: systemAvailable,
      servicesOnline,
      developmentMode: false
    });
  } catch (error) {
    console.error('Error checking AI status:', error);
    return res.status(500).json({ 
      message: 'Error checking AI service status',
      available: false
    });
  }
}

/**
 * Process a job request and find matching freelancers
 */
export async function processJobRequest(req: Request, res: Response) {
  try {
    // Require authentication for this endpoint
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Validate the job request data
    const validatedData = jobAnalysisRequestSchema.safeParse(req.body);
    
    if (!validatedData.success) {
      return res.status(400).json({ 
        message: 'Invalid job request data', 
        errors: validatedData.error.errors 
      });
    }
    
    // Extract data from the validated request
    // Note: We're extending the schema with additional fields
    const description = validatedData.data.description;
    const title = req.body.title as string;  // Get these from the raw request
    const clientId = req.body.clientId as number; // Get from the raw request
    
    if (!title || !clientId) {
      return res.status(400).json({ message: 'Title and clientId are required fields' });
    }
    
    const jobRequest = `${title}. ${description}`;
    
    console.log(`Processing job request for client ${clientId}: "${title}" (${description.length} chars)`);
    
    // Get the client information
    const client = await storage.getUser(clientId);
    
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    // Check which AI service is available
    const isDeepSeekAvailable = await deepseekService.checkAvailability();
    const isAnthropicAvailable = await anthropicService.checkAvailability();
    
    if (isDeepSeekAvailable) {
      try {
        // Extract any mentioned skills from the request (if present)
        const skills = validatedData.data.skills || [];
        const result = await deepseekService.processJobRequest(clientId, jobRequest, skills);
        return res.status(200).json({
          ...result,
          clientName: client.displayName || client.username,
          provider: 'deepseek'
        });
      } catch (error) {
        console.error('DeepSeek job request error, trying fallback:', error);
        // Continue to fallback
      }
    }
    
    if (isAnthropicAvailable) {
      try {
        // Extract any mentioned skills from the request (if present)
        const skills = validatedData.data.skills || [];
        const result = await deepseekService.processJobRequest(clientId, jobRequest, skills);
        return res.status(200).json({
          ...result,
          clientName: client.displayName || client.username,
          provider: 'anthropic',
          fallback: true
        });
      } catch (error) {
        console.error('Anthropic job request error:', error);
        // Continue to generic response
      }
    }
    
    // If all services failed, use our basic matching algorithm
    const jobMessage = `I need a ${title}. ${description}`;
    
    // Use our improved matching function to find better freelancer matches
    const topMatches = await getFilteredFreelancers(jobMessage);
    
    // Transform to match the schema expected by the UI
    const formattedFreelancers = await Promise.all(topMatches.map(async (match) => {
      // Look up the user to get display name
      const user = await storage.getUser(match.freelancer.userId);
      const displayName = user?.displayName || user?.username || 'Anonymous Freelancer';
      
      // If no specific match reasons, add a generic one
      if (match.matchReasons.length === 0) {
        match.matchReasons.push('Recommended based on overall quality score');
      }
      
      return {
        freelancerId: match.freelancer.id,
        score: match.score,
        matchReasons: match.matchReasons,
        jobPerformanceScore: match.freelancer.jobPerformance,
        skillsScore: match.freelancer.skillsExperience,
        responsivenessScore: match.freelancer.responsiveness,
        fairnessScore: match.freelancer.fairnessScore,
        // Include the full freelancer object for the UI to use
        freelancer: {
          ...match.freelancer,
          displayName
        }
      };
    }));
    
    return res.status(200).json({
      matches: formattedFreelancers,
      clientName: client.displayName || client.username,
      title,
      description,
      provider: 'basic-algorithm',
      fallback: true
    });
    
  } catch (error) {
    console.error('Error processing job request:', error);
    return res.status(500).json({ message: 'Error processing job request' });
  }
}