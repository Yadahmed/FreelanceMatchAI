import axios from 'axios';
import { storage } from '../storage';
import { 
  AIChatResponse, 
  AIMatchResult, 
  FreelancerMatch 
} from '@shared/ai-schemas';

/**
 * Service for interacting with Ollama API
 */
class OllamaService {
  private apiUrl: string;
  private model: string;
  private sessionContext: Map<number, string[]> = new Map();
  private maxContextLength: number = 10;
  
  constructor() {
    // Default to localhost:11434 as this is the standard Ollama port
    // Can be overridden with OLLAMA_API_URL environment variable
    this.apiUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434/api';
    this.model = process.env.OLLAMA_MODEL || 'deepseek-coder:6.7b'; // Use DeepSeek Coder 6.7b
    
    console.log('OllamaService initialized with config:', {
      apiUrl: this.apiUrl,
      model: this.model
    });
  }
  
  /**
   * Check if Ollama is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      // Check if Ollama server is responding
      const response = await axios.get(`${this.apiUrl}/tags`);
      return response.status === 200;
    } catch (error: any) {
      console.log('Ollama availability check failed:', error?.message || 'Unknown error');
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
   * Build the prompt with context for Ollama
   */
  private buildPrompt(userId: number, message: string): string {
    const context = this.getUserContext(userId);
    let prompt = '';
    
    // Add system context first - tailored for DeepSeek Coder
    prompt += 'You are FreelanceAI, an advanced AI assistant powered by DeepSeek Coder. You help users with a freelance marketplace platform.\n\n';
    prompt += 'Your core functions:\n';
    prompt += '1. Help users find freelancers based on project requirements and skills needed\n';
    prompt += '2. Explain how the platform works and its features\n';
    prompt += '3. Suggest optimal project structures and team compositions\n';
    prompt += '4. Provide technical guidance on project specifications\n\n';
    prompt += 'Always be helpful, concise, and professional. Focus on code and technical expertise when relevant.';
    
    // Add previous conversation context if available
    if (context.length > 0) {
      prompt += '\n\nPrevious conversation:\n';
      context.forEach(msg => {
        prompt += `${msg}\n`;
      });
      prompt += '\n';
    }
    
    // Add the current message
    prompt += `\nUser's current message: ${message}\n\nYour response:`;
    
    return prompt;
  }
  
  /**
   * Process a message with Ollama
   */
  async sendMessage(userId: number, message: string): Promise<AIChatResponse> {
    try {
      // Check availability before attempting to send
      const isAvailable = await this.checkAvailability();
      if (!isAvailable) {
        throw new Error('Ollama service is not available');
      }
      
      // Build prompt with conversation context
      const prompt = this.buildPrompt(userId, message);
      
      // Send to Ollama API - using non-streaming for consistent response handling
      const response = await axios.post(`${this.apiUrl}/generate`, {
        model: this.model,
        prompt,
        stream: false,  // Using non-streaming for simpler implementation
        options: {
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40,
          num_predict: 1024  // Allow longer responses for more detailed answers
        }
      });
      
      const aiResponse = response.data.response as string;
      
      // Add to conversation context for future messages
      this.addToContext(userId, `User: ${message}`);
      this.addToContext(userId, `AI: ${aiResponse}`);
      
      return {
        content: aiResponse,
        metadata: {
          model: this.model,
          provider: 'ollama'
        }
      };
    } catch (error: any) {
      console.error('Error sending message to Ollama:', error);
      
      if (error.response) {
        console.error('Ollama API response error:', error.response.data);
      }
      
      throw new Error(`Failed to get a response from Ollama: ${error.message}`);
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
      // Check if service is available
      const isAvailable = await this.checkAvailability();
      if (!isAvailable) {
        throw new Error('Ollama service is not available');
      }
      
      // Get all freelancers from storage
      const allFreelancers = await storage.getAllFreelancers();
      
      if (!allFreelancers || allFreelancers.length === 0) {
        throw new Error('No freelancers available for matching');
      }
      
      // Build prompt for Ollama to analyze the job request - tailored for DeepSeek Coder
      let prompt = `
      You are an advanced AI assistant powered by DeepSeek Coder for a freelance marketplace platform. Your specialized task is to analyze technical job requests and find the most suitable freelancers from our database, with particular attention to technical skills and coding expertise.
      
      Job Request Description: "${description}"
      `;
      
      if (skills.length > 0) {
        prompt += `\nRequired Skills: ${skills.join(', ')}`;
      }
      
      prompt += `\n\nAvailable Freelancers:
      ${allFreelancers.map((f) => `
      Freelancer ID: ${f.id}
      Profession: ${f.profession}
      Skills: ${f.skills ? f.skills.join(', ') : 'Not specified'}
      Experience: ${f.yearsOfExperience || 0} years
      Hourly Rate: $${f.hourlyRate || 0}
      Rating: ${f.rating || 0}/5
      Location: ${f.location || 'Not specified'}
      Bio: ${f.bio || 'Not provided'}
      Job Performance: ${f.jobPerformance || 0}/100
      `).join('\n')}
      
      Based on the job request and required skills, rank the top 3 freelancers with detailed reasoning.
      
      Format your response as JSON with the following structure:
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
      
      Ensure your response is a valid JSON object.
      `;
      
      // Send to Ollama API
      const response = await axios.post(`${this.apiUrl}/generate`, {
        model: this.model,
        prompt,
        stream: false,
        options: {
          temperature: 0.2, // Low temperature for more deterministic results
          top_p: 0.9,
          num_predict: 2048  // Allow longer responses for more detailed analysis
        }
      });
      
      let aiResponse = response.data.response as string;
      
      // Extract JSON from the response (handling potential text before/after the JSON)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to get valid JSON response from Ollama');
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
      console.error('Error processing job request with Ollama:', error);
      
      if (error.response) {
        console.error('Ollama API response error:', error.response.data);
      }
      
      throw new Error(`Failed to analyze job with Ollama: ${error.message}`);
    }
  }
}

export const ollamaService = new OllamaService();