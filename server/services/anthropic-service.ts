import Anthropic from '@anthropic-ai/sdk';
import { AIChatResponse, AIMatchResult, FreelancerMatch } from '@shared/ai-schemas';
import { storage } from '../storage';

/**
 * Service for interacting with Anthropic Claude API
 */
class AnthropicService {
  private apiKey: string | null;
  private model: string;
  private anthropic: any;
  private sessionContext: Map<number, string[]> = new Map();
  private maxContextLength: number = 10;
  
  constructor() {
    // Configure Anthropic API settings
    this.apiKey = process.env.ANTHROPIC_API_KEY || null;
    // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
    this.model = process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet-20250219';
    
    if (this.apiKey) {
      this.anthropic = new Anthropic({
        apiKey: this.apiKey,
      });
    }
    
    console.log('AnthropicService initialized with config:', {
      hasApiKey: !!this.apiKey,
      model: this.model
    });
  }
  
  /**
   * Check if Anthropic API is available
   */
  async checkAvailability(): Promise<boolean> {
    // If we have no API key, assume it's not available
    if (!this.apiKey || !this.anthropic) {
      console.log('[AnthropicService] API key not configured');
      return false;
    }
    
    try {
      console.log('[AnthropicService] Checking API availability...');
      
      // For development/testing purposes, always return true if key is configured
      if (process.env.NODE_ENV === 'development') {
        console.log('[AnthropicService] Development mode - API availability check overridden to TRUE');
        return true;
      }
      
      // Make a small test request to check if API is responding
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      });
      
      const isAvailable = !!response;
      console.log('[AnthropicService] API availability check result:', isAvailable);
      return isAvailable;
    } catch (error: any) {
      console.error('[AnthropicService] API availability check failed:', {
        message: error?.message || 'Unknown error',
        status: error?.status,
        data: error?.data,
      });
      
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
   * Build the messages array with context for Anthropic API
   */
  private buildMessages(userId: number, message: string, systemPrompt?: string): any[] {
    const context = this.getUserContext(userId);
    const messages = [];
    
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
   * Process a message using the Anthropic API
   */
  async sendMessage(userId: number, message: string, metadata?: any): Promise<AIChatResponse> {
    try {
      console.log('[AnthropicService] Processing message for user:', userId);
      
      // If no API key, use a fallback message
      if (!this.apiKey || !this.anthropic) {
        console.log('[AnthropicService] No API key configured, returning fallback message');
        return {
          content: "I'm sorry, but the Anthropic API key hasn't been configured. Please contact the administrator to set up the Anthropic API.",
          metadata: {
            model: this.model,
            provider: 'anthropic'
          }
        };
      }
      
      // Check availability
      const isAvailable = await this.checkAvailability();
      if (!isAvailable) {
        throw new Error('Anthropic API is not available');
      }
      
      // Build messages with conversation context
      const messages = this.buildMessages(userId, message);
      
      // Use custom system prompt if provided in metadata
      const systemPrompt = metadata?.system || `You are FreelanceAI, an advanced AI assistant specifically for a freelance marketplace platform.

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

Current date: ${new Date().toISOString().split('T')[0]}`;
      
      // Make the API request
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages
      });
      
      const aiResponse = response.content[0].text || 'Sorry, I could not generate a response.';
      
      // Add to conversation context for future messages
      this.addToContext(userId, `User: ${message}`);
      this.addToContext(userId, `AI: ${aiResponse}`);
      
      return {
        content: aiResponse,
        metadata: {
          model: this.model,
          provider: 'anthropic'
        }
      };
    } catch (error: any) {
      console.error('Error sending message to Anthropic:', error);
      
      // Provide a helpful error message
      let errorMessage = 'Failed to get a response from Anthropic API.';
      
      if (error.status === 401) {
        errorMessage = 'Invalid API key or authentication failure with Anthropic API.';
      } else if (error.status === 429) {
        errorMessage = 'Rate limit exceeded for Anthropic API.';
      } else if (error.status) {
        errorMessage = `Anthropic API error (${error.status}): ${error.message || 'Unknown error'}`;
      } else if (error.request) {
        errorMessage = `Network error connecting to Anthropic API: ${error.message}`;
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
      // If no API key, return a default response
      if (!this.apiKey || !this.anthropic) {
        throw new Error('Anthropic API key not configured');
      }
      
      // Check if API is available
      const isAvailable = await this.checkAvailability();
      if (!isAvailable) {
        throw new Error('Anthropic API is not available');
      }
      
      // Get all freelancers from storage
      const allFreelancers = await storage.getAllFreelancers();
      
      if (!allFreelancers || allFreelancers.length === 0) {
        throw new Error('No freelancers available for matching');
      }
      
      // Build system prompt for analyzing the job request
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
      allFreelancers.forEach((f) => {
        userMessage += `
Freelancer ID: ${f.id}
Profession: ${f.profession}
Skills: ${f.skills ? f.skills.join(', ') : 'Not specified'}
Experience: ${f.yearsOfExperience || 0} years
Hourly Rate: $${f.hourlyRate || 0}
Rating: ${f.rating || 0}/5
Location: ${f.location || 'Not specified'}
Bio: ${f.bio || 'Not provided'}
Job Performance: ${f.jobPerformance || 0}/100
`;
      });
      
      userMessage += `\nBased on the job request and required skills, rank the top 3 freelancers with detailed reasoning.`;
      
      // Make the API request
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage }
        ]
      });
      
      // Extract and parse the JSON response
      const aiResponse = response.content[0].text || '{}';
      
      // Try to extract JSON from the response in case there's extra text
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to get valid JSON response from Anthropic API');
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
          
          // Calculate weights based on our algorithm
          const jobPerformanceScore = 0.5;
          const skillsScore = 0.2;
          const responsivenessScore = 0.15;
          const fairnessScore = 0.15;
          
          // Create match reasons from reasoning
          const reasons = [match.reasoning || 'Strong match for this job request'];
          
          processedMatches.push({
            freelancerId: freelancer.id,
            score: typeof match.score === 'number' ? match.score : parseFloat(match.score),
            matchReasons: reasons,
            jobPerformanceScore,
            skillsScore,
            responsivenessScore,
            fairnessScore
          });
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
      console.error('Error processing job request with Anthropic:', error);
      
      // Provide a helpful error message
      let errorMessage = 'Failed to analyze job with Anthropic API.';
      
      if (error.status === 401) {
        errorMessage = 'Invalid API key or authentication failure with Anthropic API.';
      } else if (error.status === 429) {
        errorMessage = 'Rate limit exceeded for Anthropic API.';
      } else if (error.status) {
        errorMessage = `Anthropic API error (${error.status}): ${error.message || 'Unknown error'}`;
      } else if (error.request) {
        errorMessage = `Network error connecting to Anthropic API: ${error.message}`;
      }
      
      throw new Error(errorMessage);
    }
  }
}

export const anthropicService = new AnthropicService();