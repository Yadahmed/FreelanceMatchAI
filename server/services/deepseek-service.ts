import axios from 'axios';
import { 
  ChatResponse as AIChatResponse, // Renamed for compatibility
  AIMatchResult, 
  FreelancerMatch,
  aiChatMessages,
  aiJobAnalyses
} from '@shared/schema';
import { storage } from '../storage';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { extractFreelancerName } from '../utils/freelancer';
import { calculateMatchScore } from '../../shared/utils/match-score';

/**
 * Service for interacting with DeepSeek Coder API
 */
class DeepSeekService {
  private apiUrl: string;
  private apiKey: string | null;
  private model: string;
  private sessionContext: Map<number, string[]> = new Map();
  private maxContextLength: number = 10;
  
  constructor() {
    // Configure DeepSeek API settings
    this.apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';
    this.apiKey = process.env.DEEPSEEK_API_KEY || null;
    this.model = process.env.DEEPSEEK_MODEL || 'deepseek-reasoner';
    
    console.log('DeepSeekService initialized with config:', {
      apiUrl: this.apiUrl,
      hasApiKey: !!this.apiKey,
      model: this.model
    });
  }
  
  /**
   * Check if DeepSeek API is available
   */
  async checkAvailability(): Promise<boolean> {
    // If we have no API key, assume it's not available
    if (!this.apiKey) {
      console.log('[DeepSeekService] API key not configured');
      return false;
    }
    
    try {
      console.log('[DeepSeekService] Checking API availability...');
      
      // For development/testing purposes, let's force Ollama to be available
      // Comment this out when DeepSeek API key is properly configured 
      if (process.env.NODE_ENV === 'development') {
        console.log('[DeepSeekService] Development mode - API availability check overridden to TRUE');
        return true;
      }
      
      // Check if API is responding
      const response = await axios.get(`${this.apiUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 5000 // 5 second timeout
      });
      
      const isAvailable = response.status === 200;
      console.log('[DeepSeekService] API availability check result:', isAvailable);
      return isAvailable;
    } catch (error: any) {
      console.error('[DeepSeekService] API availability check failed:', {
        message: error?.message || 'Unknown error',
        status: error?.response?.status,
        data: error?.response?.data,
      });
      
      // Force enable for development/testing if needed
      if (process.env.NODE_ENV === 'development' || process.env.FORCE_DEEPSEEK === 'true') {
        console.log('[DeepSeekService] Development mode - API availability check overridden to TRUE despite error');
        return true;
      }
      
      return false;
    }
  }
  
  /**
   * Get the user's message history context
   */
  private getUserContext(userId: number): string[] {
    if (!this.sessionContext.has(userId)) {
      this.sessionContext.set(userId, []);
    }
    return this.sessionContext.get(userId) || [];
  }
  
  /**
   * Add a message to the user's context
   */
  private addToContext(userId: number, message: string): void {
    const context = this.getUserContext(userId);
    context.push(message);
    
    // Limit context to the last N messages
    if (context.length > this.maxContextLength) {
      context.shift();
    }
    
    this.sessionContext.set(userId, context);
  }
  
  /**
   * Build the messages array with context for DeepSeek API
   */
  private buildMessages(userId: number, message: string): any[] {
    const context = this.getUserContext(userId);
    const messages = [];
    
    // Add system message with strict topic constraints
    messages.push({
      role: 'system',
      content: `You are FreelanceAI, an advanced AI assistant powered by DeepSeek Coder specifically for a freelance marketplace platform.

YOUR SCOPE IS STRICTLY LIMITED TO FREELANCER MARKETPLACE TOPICS ONLY.

Your core functions:
1. Help users find freelancers based on project requirements and skills needed
2. Explain how the platform works and its features
3. Suggest optimal project structures and team compositions
4. Provide technical guidance on project specifications

IMPORTANT CONSTRAINTS:
- You MUST ONLY respond to questions about freelancer marketplace topics
- You MUST REFUSE to respond to questions about general knowledge, coding help unrelated to freelancers, personal advice, etc.
- You MUST REFUSE to generate any content not related to freelancer matching or the marketplace
- Your ONLY purpose is to help connect clients with freelancers and explain the platform

For ANY off-topic question, politely decline and explain that you're a specialized assistant for freelancer marketplace topics only.

Example refusal: "I'm sorry, but I'm a specialized assistant for the freelancer marketplace. I can only help with finding freelancers, project scoping, or platform features. Please ask me about these topics instead."

Always be helpful, concise, and professional within your defined scope.

Current date: ${new Date().toISOString().split('T')[0]}`
    });
    
    // Add previous conversation context if available
    if (context.length > 0) {
      for (let i = 0; i < context.length; i += 2) {
        if (i < context.length) {
          messages.push({
            role: 'user',
            content: context[i].replace('User: ', '')
          });
        }
        
        if (i + 1 < context.length) {
          messages.push({
            role: 'assistant',
            content: context[i + 1].replace('AI: ', '')
          });
        }
      }
    }
    
    // Add the current message
    messages.push({
      role: 'user',
      content: message
    });
    
    return messages;
  }
  
  /**
   * Check if a message is likely requesting freelancer information
   */
  private isFreelancerQuery(message: string): boolean {
    const lowerMsg = message.toLowerCase();
    const freelancerKeywords = [
      'find freelancer', 'looking for', 'need someone', 'hire', 
      'developer', 'designer', 'writer', 'expert', 'professional',
      'specialist', 'skills', 'recommend', 'who can', 'available freelancers',
      'based in', 'similar to', 'top rated', 'best', 'marketplace',
      'i need', 'job', 'work', 'project', 'build', 'create', 'develop',
      'help with', 'coding', 'programming', 'app', 'website'
    ];
    
    return freelancerKeywords.some(keyword => lowerMsg.includes(keyword));
  }
  
  /**
   * Determine if we should ask clarifying questions instead of directly suggesting freelancers
   */
  private shouldAskClarifyingQuestions(message: string): boolean {
    const lowerMsg = message.toLowerCase();
    
    // Get messages from context to see if this is the first message
    const userContext = this.getUserContext(0); // Using default user ID
    const isFirstFewMessages = userContext.length <= 4; // If 4 or fewer messages, consider it the start of conversation
    
    // If this is among the first few messages about freelancers, always ask clarifying questions
    if (isFirstFewMessages && this.isFreelancerQuery(message)) {
      return true;
    }
    
    // Check if the message is too vague (less than 10 words)
    const wordCount = message.trim().split(/\s+/).length;
    if (wordCount < 10) {
      return true;
    }
    
    // Check if specific details are missing
    const missingDetails = [
      // Missing budget details
      !lowerMsg.includes('budget') && !lowerMsg.includes('pay') && !lowerMsg.includes('cost') && !lowerMsg.includes('price'),
      
      // Missing timeline
      !lowerMsg.includes('timeline') && !lowerMsg.includes('deadline') && !lowerMsg.includes('by') && !lowerMsg.includes('due'),
      
      // Missing skill specification
      !lowerMsg.includes('skill') && !lowerMsg.includes('experience') && !lowerMsg.includes('qualified')
    ];
    
    // If any key details are missing, ask clarifying questions
    // Changed from "2 or more" to "any" to make the system more likely to ask questions
    return missingDetails.filter(Boolean).length >= 1;
  }
  
  /**
   * Generate clarifying questions based on the user's message
   */
  private generateClarifyingQuestions(message: string): string[] {
    const lowerMsg = message.toLowerCase();
    const questions = [];
    
    // Budget questions
    if (!lowerMsg.includes('budget') && !lowerMsg.includes('pay') && !lowerMsg.includes('cost')) {
      questions.push('What is your budget for this project?');
    }
    
    // Timeline questions
    if (!lowerMsg.includes('timeline') && !lowerMsg.includes('deadline') && !lowerMsg.includes('due')) {
      questions.push('What is your timeline or deadline for this project?');
    }
    
    // Skill questions
    if (!lowerMsg.includes('skill') && !lowerMsg.includes('experience')) {
      questions.push('What specific skills or experience are you looking for in a freelancer?');
    }
    
    // Project scope questions
    if (!lowerMsg.includes('scope') && !lowerMsg.includes('deliverable')) {
      questions.push('Can you describe the scope and deliverables for this project in more detail?');
    }
    
    // Location or language questions
    if (!lowerMsg.includes('location') && !lowerMsg.includes('language') && !lowerMsg.includes('remote')) {
      questions.push('Do you have any requirements regarding freelancer location, working hours, or language?');
    }
    
    return questions.slice(0, 3); // Limit to 3 questions max
  }
  
  /**
   * Process a message using the DeepSeek API
   */
  async sendMessage(userId: number, message: string): Promise<AIChatResponse> {
    try {
      console.log('[DeepSeekService] Processing message for user:', userId);
      
      // If no API key, use a fallback message
      if (!this.apiKey) {
        console.log('[DeepSeekService] No API key configured, returning fallback message');
        return {
          content: "I'm sorry, but the DeepSeek API key hasn't been configured. Please contact the administrator to set up the DeepSeek API.",
          metadata: {
            model: this.model,
            provider: 'deepseek'
          }
        };
      }
      
      // Development mode fallback for testing
      if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_AI === 'true') {
        console.log('[DeepSeekService] Using mock response in development mode');
        return this.getMockResponse(userId, message);
      }
      
      // Check availability
      const isAvailable = await this.checkAvailability();
      if (!isAvailable) {
        throw new Error('DeepSeek API is not available');
      }
      
      // Build messages with conversation context
      const messages = this.buildMessages(userId, message);
      let freelancerDataIncluded = false;
      
      // Check if this is likely a query about freelancers
      if (this.isFreelancerQuery(message)) {
        // First check if we should ask clarifying questions instead of offering matches
        if (this.shouldAskClarifyingQuestions(message)) {
          console.log('[DeepSeekService] Asking clarifying questions before recommending freelancers');
          
          // Generate questions based on the message
          const clarifyingQuestions = this.generateClarifyingQuestions(message);
          
          if (clarifyingQuestions.length > 0) {
            // Modify the message instruction to ask clarifying questions
            const lastMessageIndex = messages.length - 1;
            const clarifyingInstruction = `\n\nBefore recommending specific freelancers, I need to ask a few clarifying questions to better understand your needs. Please respond to these questions to help me find the most suitable match for your project:\n\n${clarifyingQuestions.map((q, i) => `${i+1}. ${q}`).join('\n')}`;
            
            // Update the system message to instruct the AI to ask questions
            for (let i = 0; i < messages.length; i++) {
              if (messages[i].role === 'system') {
                messages[i].content += `\n\nFor this user request, please ask clarifying questions to better understand their needs before recommending specific freelancers. Do not provide recommendations yet.`;
                break;
              }
            }
            
            // Create the API request and get the response
            const requestBody: any = {
              messages,
              temperature: 0.7,
              max_tokens: 1024
            };
            
            // Only include model if specified
            if (this.model) {
              requestBody.model = this.model;
            }
            
            const response = await axios.post(`${this.apiUrl}/chat/completions`, requestBody, {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
              }
            });
            
            const aiResponse = response.data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
            
            // Add to conversation context for future messages
            this.addToContext(userId, `User: ${message}`);
            this.addToContext(userId, `AI: ${aiResponse}`);
            
            return {
              content: aiResponse,
              metadata: {
                model: this.model,
                provider: 'deepseek',
                clarifyingQuestions: clarifyingQuestions,
                needsMoreInfo: true
              }
            };
          }
        }
        
        try {
          // Get real freelancer data from the database
          const allFreelancers = await storage.getAllFreelancers();
          
          if (allFreelancers && allFreelancers.length > 0) {
            console.log('[DeepSeekService] Adding real freelancer data to prompt');
            freelancerDataIncluded = true;
            
            // Get all relevant users for the freelancers
            const userIds = allFreelancers.map(f => f.userId);
            const users = await storage.getUsersByIds(userIds);
            const userMap = new Map();
            users.forEach(user => {
              userMap.set(user.id, user);
            });
            
            // Format the freelancer information
            let freelancerInfo = '\n\nHere are some actual freelancers from our database who might be relevant to your request:\n\n';
            
            // Add up to 5 freelancers
            const relevantFreelancers = allFreelancers.slice(0, 5);
            relevantFreelancers.forEach(f => {
              // Get the user associated with this freelancer for display name
              const freelancerUser = userMap.get(f.userId);
              const displayName = freelancerUser?.displayName || freelancerUser?.username || 'Freelancer ' + f.id;
              freelancerInfo += `**[FREELANCER_ID:${f.id}] ${displayName} - ${f.profession} in ${f.location}**\n`;
              freelancerInfo += `Skills: ${f.skills ? f.skills.join(', ') : 'Not specified'}\n`;
              freelancerInfo += `Experience: ${f.yearsOfExperience} years | Rating: ${f.rating}/5 | Rate: $${f.hourlyRate}/hr\n`;
              freelancerInfo += `${f.bio}\n\n`;
            });
            
            // Add specific instructions about the required format for freelancers
            freelancerInfo += '\n\nFORMATTING REQUIREMENTS:';
            freelancerInfo += '\n- When mentioning freelancers, you MUST ALWAYS use the format: "[FREELANCER_ID:X] Freelancer Name" where X is their ID number';
            freelancerInfo += '\n- The [FREELANCER_ID:X] tag is REQUIRED for EVERY mentioned freelancer';
            freelancerInfo += '\n- Present freelancer details exactly as shown in the examples above';
            freelancerInfo += '\n- Always include at least 2-3 relevant freelancers with their skills, experience and rates';
            
            // Update the last user message to include freelancer data
            const lastMessageIndex = messages.length - 1;
            messages[lastMessageIndex].content += freelancerInfo;
          }
        } catch (error) {
          console.error('[DeepSeekService] Error fetching freelancer data:', error);
          // Continue without freelancer data if there's an error
        }
      }
      
      // Make the API request
      const requestBody: any = {
        messages,
        temperature: 0.7,
        max_tokens: 1024
      };
      
      // Only include model if specified
      if (this.model) {
        requestBody.model = this.model;
      }
      
      const response = await axios.post(`${this.apiUrl}/chat/completions`, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      const aiResponse = response.data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
      
      // Add to conversation context for future messages
      this.addToContext(userId, `User: ${message}`);
      this.addToContext(userId, `AI: ${aiResponse}`);
      
      return {
        content: aiResponse,
        metadata: {
          model: this.model,
          provider: 'deepseek',
          freelancerDataIncluded
        }
      };
    } catch (error: any) {
      console.error('Error sending message to DeepSeek:', error);
      
      // Provide a helpful error message
      let errorMessage = 'Failed to get a response from DeepSeek API.';
      
      if (error.response?.status === 401) {
        errorMessage = 'Invalid API key or authentication failure with DeepSeek API.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Rate limit exceeded for DeepSeek API.';
      } else if (error.response) {
        errorMessage = `DeepSeek API error (${error.response.status}): ${error.response.data?.error?.message || error.message}`;
      } else if (error.request) {
        errorMessage = `Network error connecting to DeepSeek API: ${error.message}`;
      }
      
      throw new Error(errorMessage);
    }
  }
  
  /**
   * Process a job request and find matching freelancers
   */
  async processJobRequest(
    userId: number, 
    description: string, 
    skills: string[] = []
  ): Promise<AIMatchResult> {
    try {
      // Development mode should use real freelancers from the database
      if (process.env.NODE_ENV === 'development') {
        console.log('[DeepSeekService] Using real database freelancers for job matching in development mode');
        return this.getMockJobMatches(userId, description, skills);
      }
      
      // If no API key, return a default response
      if (!this.apiKey) {
        throw new Error('DeepSeek API key not configured');
      }
      
      // Check if API is available
      const isAvailable = await this.checkAvailability();
      if (!isAvailable) {
        throw new Error('DeepSeek API is not available');
      }
      
      // Get all freelancers from storage
      const allFreelancers = await storage.getAllFreelancers();
      
      if (!allFreelancers || allFreelancers.length === 0) {
        throw new Error('No freelancers available for matching');
      }
      
      // Check if we should ask clarifying questions first
      if (this.shouldAskClarifyingQuestions(description)) {
        const clarifyingQuestions = this.generateClarifyingQuestions(description);
        
        // If we have clarifying questions, return them instead of job matches
        if (clarifyingQuestions.length > 0) {
          console.log('[DeepSeekService] Returning clarifying questions for job analysis');
          
          // Create a helpful analysis with questions
          const analysisText = `I need a bit more information about your job requirements to find the best freelancers for you. Please provide details about the following:`;
          
          return {
            jobAnalysis: {
              description: description,
              skills: skills,
              analysisText: analysisText,
              needsMoreInfo: true
            },
            matches: [], // Empty matches since we need more info first
            suggestedQuestions: clarifyingQuestions
          };
        }
      }
      
      // Build messages for analyzing the job request
      const systemPrompt = `You are an advanced AI assistant for a freelance marketplace platform.
Your specialized task is to analyze technical job requests and find the most suitable freelancers
from our database, with particular attention to technical skills and coding expertise.

The user will provide a job description, and you'll have access to our freelancer database.
Your task is to rank the top 3 freelancers based on the job requirements.

Format your response as JSON with this exact structure:
{
  "analysis": "Your analysis of the job request",
  "matches": [
    {
      "freelancerId": 1,
      "score": 0.95,
      "reasoning": "Why this freelancer is a good match"
    },
    ...
  ]
}

Ensure your response is ONLY the valid JSON object - no additional text.`;
      
      // Create the user message with the job details and freelancer database
      let userMessage = `Job Request Description: "${description}"\n\n`;
      
      if (skills.length > 0) {
        userMessage += `Required Skills: ${skills.join(', ')}\n\n`;
      }
      
      userMessage += `Available Freelancers:\n`;
      
      // Create a map of freelancer info for later use
      const freelancersMap = new Map();
      
      // Get all user IDs from these freelancers to load user data
      const userIds = allFreelancers.map(f => f.userId);
      const users = await Promise.all(userIds.map(id => storage.getUser(id)));
      
      // Create a map of userId to displayName
      const userNameMap = new Map();
      users.forEach(user => {
        if (user) {
          userNameMap.set(user.id, user.displayName || user.username || `Freelancer ${user.id}`);
        }
      });
      
      allFreelancers.forEach((f) => {
        // Store the freelancer in the map for later lookup
        freelancersMap.set(f.id, f);
        
        // Get the user info for this freelancer to include name
        const displayName = userNameMap.get(f.userId) || `Freelancer ${f.id}`;
        
        userMessage += `
Freelancer ID: ${f.id}
Name: ${displayName}
Profession: ${f.profession}
Skills: ${f.skills ? f.skills.join(', ') : 'Not specified'}
Experience: ${f.yearsOfExperience || 0} years
Hourly Rate: $${f.hourlyRate || 0}
Rating: ${f.rating || 0}/5
Location: ${f.location || 'Not specified'}
Bio: ${f.bio || 'Not provided'}
Job Performance: ${f.jobPerformance || 0}/100
Skills Experience: ${f.skillsExperience || 0}/100  
Responsiveness: ${f.responsiveness || 0}/100
Fairness Score: ${f.fairnessScore || 0}/100
`;
      });
      
      userMessage += `\nBased on the job request and required skills, rank the top 3 freelancers with detailed reasoning. Include their full names in your response.`;
      
      // Make the API request
      const requestBody: any = {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.2,
        max_tokens: 2048
      };
      
      // Only include model if specified
      if (this.model) {
        requestBody.model = this.model;
      }
      
      const response = await axios.post(`${this.apiUrl}/chat/completions`, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      // Extract and parse the JSON response
      const aiResponse = response.data.choices[0]?.message?.content || '{}';
      
      // Try to extract JSON from the response in case there's extra text
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to get valid JSON response from DeepSeek API');
      }
      
      const jsonStr = jsonMatch[0];
      const result = JSON.parse(jsonStr);
      
      // Transform and validate the response
      const processedMatches: FreelancerMatch[] = [];
      
      // Make sure we have the expected structure
      if (result.matches && Array.isArray(result.matches)) {
        // Convert to our expected format and look up full freelancer details
        for (const match of result.matches) {
          const freelancerId = Number(match.freelancerId);
          
          if (isNaN(freelancerId)) continue;
          
          const freelancer = await storage.getFreelancer(freelancerId);
          if (!freelancer) continue;
          
          // Get the user info for this freelancer
          const user = await storage.getUser(freelancer.userId);
          const displayName = user?.displayName || user?.username || `Freelancer ${freelancerId}`;
          
          // Calculate individual component scores using our algorithm
          const totalScore = calculateMatchScore(
            freelancer.jobPerformance,
            freelancer.skillsExperience,
            freelancer.responsiveness,
            freelancer.fairnessScore
          );
          
          // Calculate individual components for display
          const jobPerformanceScore = (Math.min(100, Math.max(0, freelancer.jobPerformance)) / 100) * 0.5;  // 50% weight
          const skillsScore = (Math.min(100, Math.max(0, freelancer.skillsExperience)) / 100) * 0.2;        // 20% weight  
          const responsivenessScore = (Math.min(100, Math.max(0, freelancer.responsiveness)) / 100) * 0.15; // 15% weight
          const fairnessScore = (Math.min(100, Math.max(0, freelancer.fairnessScore)) / 100) * 0.15;        // 15% weight
          
          // Create match reasons from reasoning
          const reasons = [match.reasoning || 'Strong match for this job request'];
          
          // Create match result with only the required properties according to schema
          const matchResult: FreelancerMatch = {
            freelancerId: freelancer.id,
            score: Math.min(100, Math.max(0, typeof match.score === 'number' ? match.score : parseFloat(match.score))),
            matchReasons: reasons,
            jobPerformanceScore,
            skillsScore,
            responsivenessScore,
            fairnessScore
          };
          
          // Add the fully typed freelancer object for UI to use
          if (freelancer) {
            // @ts-ignore - We know this is compatible with the schema
            matchResult.freelancer = {
              id: freelancer.id,
              userId: freelancer.userId,
              profession: freelancer.profession,
              skills: freelancer.skills,
              bio: freelancer.bio,
              hourlyRate: freelancer.hourlyRate,
              yearsOfExperience: freelancer.yearsOfExperience,
              rating: freelancer.rating,
              jobPerformance: freelancer.jobPerformance,
              skillsExperience: freelancer.skillsExperience,
              responsiveness: freelancer.responsiveness,
              fairnessScore: freelancer.fairnessScore,
              completedJobs: freelancer.completedJobs || 0,
              location: freelancer.location,
              availability: freelancer.availability || true,
              imageUrl: freelancer.imageUrl,
              // Add display name from user
              displayName: displayName
            };
          }
          
          processedMatches.push(matchResult);
        }
      }
      
      // Sort by score (highest first)
      processedMatches.sort((a, b) => b.score - a.score);
      
      return {
        jobAnalysis: {
          description: description,
          skills: skills,
          analysisText: result.analysis || 'Analysis not provided'
        },
        matches: processedMatches.slice(0, 3), // Limit to top 3
        suggestedQuestions: [
          'What skills are most important for this job?',
          'Can you explain more about the job requirements?',
          'What is the typical timeframe for this kind of project?'
        ]
      };
    } catch (error: any) {
      console.error('Error processing job request with DeepSeek:', error);
      
      // Provide a helpful error message
      let errorMessage = 'Failed to analyze job with DeepSeek API.';
      
      if (error.response?.status === 401) {
        errorMessage = 'Invalid API key or authentication failure with DeepSeek API.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Rate limit exceeded for DeepSeek API.';
      } else if (error.response) {
        errorMessage = `DeepSeek API error (${error.response.status}): ${error.response.data?.error?.message || error.message}`;
      } else if (error.request) {
        errorMessage = `Network error connecting to DeepSeek API: ${error.message}`;
      }
      
      throw new Error(errorMessage);
    }
  }
  
  /**
   * Generate a mock response for development/testing
   */
  private getMockResponse(userId: number, message: string): AIChatResponse {
    // Add to conversation context
    this.addToContext(userId, `User: ${message}`);
    
    // Generate a contextual response based on the message
    let response = '';
    
    if (message.toLowerCase().includes('freelancer') || message.toLowerCase().includes('platform')) {
      response = "Our freelancer platform connects clients with skilled professionals across various domains. We currently have freelancers specializing in web development, mobile app development, design, content writing, and more. How can I help you find the right freelancer for your project?";
    } else if (message.toLowerCase().includes('how') && message.toLowerCase().includes('work')) {
      response = "Our platform works in 3 simple steps: 1) Post your job requirements, 2) Get matched with relevant freelancers based on skills and experience, 3) Choose the best fit and start working together. We handle the contracts, payments, and communication, making the process seamless.";
    } else if (message.toLowerCase().includes('payment') || message.toLowerCase().includes('cost')) {
      response = "Our payment system is secure and transparent. Clients pay upfront into an escrow account, and funds are released to freelancers upon successful completion of milestones or the entire project. We charge a 5% platform fee on transactions.";
    } else {
      response = "I'm here to help you with anything related to our freelancer marketplace. Whether you need to find talent, understand our platform, or get support during your project, just let me know what you're looking for.";
    }
    
    // Add to conversation context
    this.addToContext(userId, `AI: ${response}`);
    
    return {
      content: response,
      metadata: {
        model: 'mock-development-model',
        provider: 'deepseek',
        mock: true
      }
    };
  }
  
  /**
   * Generate mock job request matches using real freelancers from the database
   */
  async getMockJobMatches(
    userId: number,
    description: string,
    skills: string[] = []
  ): Promise<AIMatchResult> {
    try {
      console.log('[DeepSeekService] Generating mock job matches with real database freelancers');
      
      // Get actual freelancers from the database
      const allFreelancers = await storage.getAllFreelancers();
      
      if (!allFreelancers || allFreelancers.length === 0) {
        throw new Error('No freelancers available in the database for matching');
      }
      
      console.log(`[DeepSeekService] Found ${allFreelancers.length} freelancers in database`);
      
      // Create a scoring function to rank freelancers based on the job description
      const scoreFreelancer = (freelancer: any) => {
        let score = 0;
        
        // Extract key terms from the job description
        const descriptionLower = description.toLowerCase();
        const descriptionTerms = descriptionLower.split(/\s+/).filter(term => 
          term.length > 3 && !['with', 'this', 'that', 'have', 'from', 'they', 'will', 'what', 'when', 'where', 'your'].includes(term)
        );

        // Get profession match (very important)
        const professionLower = (freelancer.profession || '').toLowerCase();
        const professionScore = descriptionTerms.some(term => professionLower.includes(term)) ? 30 : 0;
        
        // Extra points for exact profession match
        if (descriptionLower.includes(professionLower)) {
          score += 40; // Significant boost for profession directly mentioned
          console.log(`[Matching] Exact profession match found for freelancer ${freelancer.id}: ${freelancer.profession}`);
        } else {
          score += professionScore;
        }
        
        // Score based on skills match (also important)
        const freelancerSkills = Array.isArray(freelancer.skills) ? freelancer.skills : [];
        const requestedSkills = skills.map(s => s.toLowerCase());
        
        // Count matching skills from both the requested skills array and description text
        const matchingSkills = freelancerSkills.filter((skill: string) => {
          const skillLower = skill.toLowerCase();
          
          // Check against explicitly requested skills
          const matchesRequestedSkill = requestedSkills.some(reqSkill => 
            skillLower.includes(reqSkill) || reqSkill.includes(skillLower)
          );
          
          // Check against terms in the description
          const matchesDescription = descriptionTerms.some(term => 
            skillLower.includes(term) || term.includes(skillLower)
          );
          
          return matchesRequestedSkill || matchesDescription;
        });
        
        // Skills match provides a base score
        const skillMatchScore = (matchingSkills.length / Math.max(Math.max(freelancerSkills.length, 1), 1)) * 30;
        score += skillMatchScore;
        
        if (matchingSkills.length > 0) {
          console.log(`[Matching] Skills match for freelancer ${freelancer.id}: ${matchingSkills.join(', ')}`);
        }
        
        // Use our validated match score calculation with proper clamping
        // But only as a baseline - our content-based matching is more important
        const baseScore = calculateMatchScore(
          freelancer.jobPerformance,
          freelancer.skillsExperience,
          freelancer.responsiveness,
          freelancer.fairnessScore
        );
        
        // Apply the base score at a reduced weight
        score = Math.round(score * 0.7 + baseScore * 0.3);
        
        console.log(`[Matching] Final score for freelancer ${freelancer.id} (${freelancer.profession}): ${score}`);
        
        return score;
      };
      
      // Score and rank all freelancers
      const scoredFreelancers = allFreelancers.map(freelancer => {
        const totalScore = scoreFreelancer(freelancer);
        return {
          freelancer,
          score: totalScore
        };
      });
      
      // Sort freelancers by score (highest first)
      scoredFreelancers.sort((a, b) => b.score - a.score);
      
      // Take top 3 matches
      const topMatches = scoredFreelancers.slice(0, 3);
      
      // Format matches for the response
      const processedMatches: FreelancerMatch[] = await Promise.all(
        topMatches.map(async (match) => {
          const f = match.freelancer;
          
          // Get the user info for this freelancer
          const user = await storage.getUser(f.userId);
          const displayName = extractFreelancerName(f, user);
          
          // Create match reasons based on skills and experience
          const matchingSkills = Array.isArray(f.skills) ? f.skills : [];
          
          // Generate reasoning for the match
          let matchReasons = [];
          
          if (f.jobPerformance > 90) {
            matchReasons.push(`${displayName} has exceptional job performance ratings (${f.jobPerformance}%)`);
          } else if (f.jobPerformance > 80) {
            matchReasons.push(`${displayName} has strong job performance ratings (${f.jobPerformance}%)`);
          }
          
          if (matchingSkills.length > 0) {
            matchReasons.push(`Skills match: ${matchingSkills.slice(0, 3).join(', ')}${matchingSkills.length > 3 ? '...' : ''}`);
          }
          
          if (f.yearsOfExperience && f.yearsOfExperience > 5) {
            matchReasons.push(`${f.yearsOfExperience} years of professional experience`);
          }
          
          if (f.location.includes('Iraq')) {
            matchReasons.push(`Located in ${f.location}`);
          }
          
          // Calculate component scores based on our algorithm weights with proper validation
          const jobPerformanceScore = (Math.min(100, Math.max(0, f.jobPerformance)) / 100) * 0.5;  // 50% weight
          const skillsScore = (Math.min(100, Math.max(0, f.skillsExperience)) / 100) * 0.2;        // 20% weight
          const responsivenessScore = (Math.min(100, Math.max(0, f.responsiveness)) / 100) * 0.15; // 15% weight
          const fairnessScore = (Math.min(100, Math.max(0, f.fairnessScore)) / 100) * 0.15;        // 15% weight
                    
          // Return a complete freelancer object with all information needed by the client
          return {
            freelancerId: f.id,
            score: Math.min(100, Math.max(0, Math.round(match.score))),
            matchReasons: matchReasons,
            jobPerformanceScore,
            skillsScore,
            responsivenessScore,
            fairnessScore,
            // Include all freelancer details for rendering the FreelancerCard component
            freelancer: {
              id: f.id,
              userId: f.userId,
              profession: f.profession,
              skills: f.skills,
              bio: f.bio,
              hourlyRate: f.hourlyRate,
              yearsOfExperience: f.yearsOfExperience,
              rating: f.rating,
              jobPerformance: f.jobPerformance,
              skillsExperience: f.skillsExperience,
              responsiveness: f.responsiveness,
              fairnessScore: f.fairnessScore,
              completedJobs: f.completedJobs || 0,
              location: f.location,
              availability: f.availability || true,
              imageUrl: f.imageUrl,
              displayName: displayName // Use the extracted name
            }
          };
        })
      );
      
      // Generate analysis text based on the job description
      let analysisText = `Based on your job description, you're looking for `;
      
      if (description.toLowerCase().includes('develop')) {
        analysisText += `development expertise. `;
      } else if (description.toLowerCase().includes('design')) {
        analysisText += `design expertise. `;
      } else if (description.toLowerCase().includes('write') || description.toLowerCase().includes('content')) {
        analysisText += `content writing expertise. `;
      } else {
        analysisText += `professional expertise. `;
      }
      
      if (skills.length > 0) {
        analysisText += `Key skills required include ${skills.join(', ')}. `;
      }
      
      analysisText += `I've found ${processedMatches.length} qualified freelancers in the platform database who match your requirements.`;
      
      // Create suggested questions based on the job and missing details
      let suggestedQuestions = [];
      
      // If this is a vague request, add specific follow-up questions
      if (this.shouldAskClarifyingQuestions(description)) {
        suggestedQuestions = this.generateClarifyingQuestions(description);
      } else {
        // Default follow-up questions if the initial request is detailed enough
        suggestedQuestions = [
          'What hourly rate should I expect to pay for this type of work?',
          'How long might this project take to complete?', 
          'What additional information should I provide to these freelancers?'
        ];
      }
      
      return {
        jobAnalysis: {
          description: description,
          skills: skills,
          analysisText: analysisText
        },
        matches: processedMatches,
        suggestedQuestions: suggestedQuestions
      };
    } catch (error: any) {
      console.error('Error generating mock job matches:', error);
      throw new Error(`Failed to generate mock matches: ${error.message}`);
    }
  }
}

export const deepseekService = new DeepSeekService();