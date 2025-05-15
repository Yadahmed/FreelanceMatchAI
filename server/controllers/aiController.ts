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
    'marketing', 'digital marketing', 'social media', 'seo'
  ];
  
  return freelancerKeywords.some(keyword => lowerMsg.includes(keyword));
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
        score += 35; // High score for profession match
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
        score += 25;
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
    
    // Weight baseline less when we have a good content match
    score = score > 0 ? 
      Math.round(score * 0.7 + baselineScore * 0.3) : 
      baselineScore;
    
    return {
      freelancer,
      score,
      matchReasons
    };
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
    'marketer': ['marketer', 'marketing', 'digital marketing', 'social media', 'seo', 'content marketing', 'ads'],
    'video': ['video', 'editing', 'animation', 'motion graphics', 'filmmaker'],
    'photographer': ['photo', 'photographer', 'photography'],
    'consultant': ['consultant', 'advisor', 'strategy', 'business'],
    'teacher': ['teacher', 'tutor', 'instructor', 'trainer', 'coach'],
    'assistant': ['assistant', 'virtual assistant', 'admin', 'secretary']
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
          
          // Get top freelancers to include in the response
          const matchedFreelancers = await storage.getTopFreelancersByRanking(3);
          
          // Transform to match the schema expected by the UI
          const formattedFreelancers = await Promise.all(matchedFreelancers.map(async (freelancer) => {
            // Look up the user to get display name
            const user = await storage.getUser(freelancer.userId);
            const displayName = user?.displayName || user?.username || 'Anonymous Freelancer';
            
            // Calculate match score using the same algorithm as the chat controller
            const matchScore = Math.round(
              (freelancer.jobPerformance * 0.5) +
              (freelancer.skillsExperience * 0.2) +
              (freelancer.responsiveness * 0.15) +
              (freelancer.fairnessScore * 0.15)
            );
            
            return {
              freelancerId: freelancer.id,
              score: matchScore,
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
          
          // Get top freelancers to include in the response
          const matchedFreelancers = await storage.getTopFreelancersByRanking(3);
          
          // Transform to match the schema expected by the UI
          const formattedFreelancers = await Promise.all(matchedFreelancers.map(async (freelancer) => {
            // Look up the user to get display name
            const user = await storage.getUser(freelancer.userId);
            const displayName = user?.displayName || user?.username || 'Anonymous Freelancer';
            
            // Calculate match score using the same algorithm as the chat controller
            const matchScore = Math.round(
              (freelancer.jobPerformance * 0.5) +
              (freelancer.skillsExperience * 0.2) +
              (freelancer.responsiveness * 0.15) +
              (freelancer.fairnessScore * 0.15)
            );
            
            return {
              freelancerId: freelancer.id,
              score: matchScore,
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
          
          // Get top freelancers to include in the response
          const matchedFreelancers = await storage.getTopFreelancersByRanking(3);
          
          // Transform to match the schema expected by the UI
          const formattedFreelancers = await Promise.all(matchedFreelancers.map(async (freelancer) => {
            // Look up the user to get display name
            const user = await storage.getUser(freelancer.userId);
            const displayName = user?.displayName || user?.username || 'Anonymous Freelancer';
            
            // Calculate match score using the same algorithm as the chat controller
            const matchScore = Math.round(
              (freelancer.jobPerformance * 0.5) +
              (freelancer.skillsExperience * 0.2) +
              (freelancer.responsiveness * 0.15) +
              (freelancer.fairnessScore * 0.15)
            );
            
            return {
              freelancerId: freelancer.id,
              score: matchScore,
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
        console.error('Ollama fallback service error:', ollamaError);
        // Continue to error response if Ollama also fails
      }
    }
    
    // If all AI services are unavailable or failed
    return res.status(503).json({ 
      message: 'All AI services are currently unavailable',
      fallback: true,
      content: 'I apologize, but our AI services are currently unavailable. We\'ve tried both DeepSeek and Ollama services without success. Please try again later.',
    });
  } catch (error: any) {
    console.error('Error processing AI message:', error);
    
    // Handle validation errors
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: 'Invalid request data', details: error.errors });
    }

    return res.status(500).json({ 
      message: error.message || 'Error processing your message',
      fallback: true,
      content: 'I apologize, but I encountered an error while processing your message. Please try again.'
    });
  }
}

/**
 * Check the status of AI services
 */
export async function checkAIStatus(req: Request, res: Response) {
  try {
    // Check status of each AI service
    const deepseekAvailable = await deepseekService.checkAvailability();
    const anthropicAvailable = await anthropicService.checkAvailability();
    const ollamaAvailable = await ollamaService.checkAvailability();
    
    // If at least one service is available, the overall status is OK
    const servicesAvailable = deepseekAvailable || anthropicAvailable || ollamaAvailable;
    
    return res.status(200).json({
      status: servicesAvailable ? 'available' : 'unavailable',
      services: {
        deepseek: deepseekAvailable,
        anthropic: anthropicAvailable,
        ollama: ollamaAvailable
      }
    });
  } catch (error) {
    console.error('Error checking AI status:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to check AI service status'
    });
  }
}

/**
 * Process a job request and find matching freelancers
 */
export async function processJobRequest(req: Request, res: Response) {
  try {
    // Authentication is no longer required for this endpoint
    // Using a default user ID of 0 for non-authenticated requests
    const userId = req.user ? req.user.id : 0;

    // Validate request body
    const requestData = jobAnalysisRequestSchema.safeParse(req.body);
    
    if (!requestData.success) {
      return res.status(400).json({ 
        message: 'Invalid job request data',
        details: requestData.error.errors
      });
    }
    
    const { description, skills = [] } = requestData.data;
    
    // First try DeepSeek service
    const isDeepSeekAvailable = await deepseekService.checkAvailability();
    
    // If DeepSeek is available, use it
    if (isDeepSeekAvailable) {
      try {
        const result = await deepseekService.processJobRequest(userId, description, skills || []);
        
        // Add provider info to the result
        return res.status(200).json({
          ...result,
          provider: 'deepseek'
        });
      } catch (deepseekError) {
        console.error('DeepSeek job analysis error, trying fallback:', deepseekError);
        // Continue to fallback if DeepSeek fails
      }
    }
    
    // Try Anthropic as first fallback
    const isAnthropicAvailable = await anthropicService.checkAvailability();
    
    if (isAnthropicAvailable) {
      try {
        console.log('[processJobRequest] Using Anthropic as fallback');
        const result = await anthropicService.processJobRequest(userId, description, skills || []);
        
        // Add provider info to the result
        return res.status(200).json({
          ...result,
          provider: 'anthropic',
          fallback: true
        });
      } catch (anthropicError) {
        console.error('Anthropic job analysis error, trying next fallback:', anthropicError);
        // Continue to next fallback if Anthropic fails
      }
    }
    
    // Try Ollama as final fallback
    const isOllamaAvailable = await ollamaService.checkAvailability();
    
    if (isOllamaAvailable) {
      try {
        const result = await ollamaService.processJobRequest(userId, description, skills || []);
        
        // Add provider info to the result
        return res.status(200).json({
          ...result,
          provider: 'ollama',
          fallback: true
        });
      } catch (ollamaError) {
        console.error('Ollama job analysis error:', ollamaError);
        // Continue to error response if Ollama also fails
      }
    }
    
    // If all AI services are unavailable or failed, return a default response
    return res.status(503).json({
      message: 'All AI services are currently unavailable',
      error: true,
      fallback: true,
      jobAnalysis: {
        description: description,
        skills: skills || [],
        requirements: [],
        suggestedSkills: [],
        estimatedTime: 'Unknown',
        estimatedBudget: 'Unknown'
      },
      matches: []
    });
  } catch (error: any) {
    console.error('Error processing job request:', error);
    
    return res.status(500).json({ 
      message: error.message || 'Error processing job request',
      error: true
    });
  }
}