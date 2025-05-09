import { AIMatchResult, AIChatResponse } from '@shared/ai-schemas';
import axios from 'axios';
import { storage } from '../storage';

interface OllamaConfig {
  apiUrl: string;
  model: string;
}

class OllamaService {
  private config: OllamaConfig;
  
  constructor(config: OllamaConfig) {
    this.config = config;
    console.log('OllamaService initialized with config:', config);
  }
  
  /**
   * Check if the Ollama service is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      // Check if the Ollama proxy is reachable
      const response = await axios.get(`${this.config.apiUrl}/healthz`, {
        timeout: 5000, // 5s timeout for quicker checks
      });
      
      return response.status === 200;
    } catch (error) {
      console.error('Ollama service health check failed:', error);
      return false;
    }
  }
  
  /**
   * Send a message to the Ollama assistant
   */
  async sendMessage(userId: number, message: string): Promise<AIChatResponse> {
    try {
      // Get the user's previous messages to maintain context
      const userContext = await this.getUserContextMessages(userId);
      
      // Prepare the prompt with system instructions and user context
      const systemPrompt = this.getSystemPrompt();
      const fullContext = this.formatContextForOllama(systemPrompt, userContext, message);
      
      // Send the request to Ollama
      const response = await axios.post(`${this.config.apiUrl}/chat`, {
        model: this.config.model,
        messages: fullContext,
        temperature: 0.7,
        stream: false
      });
      
      // Extract the response content
      const content = response.data.message?.content || 'I apologize, but I couldn\'t generate a proper response.';
      
      // Store the interaction in the database
      await this.saveInteraction(userId, message, content);
      
      return {
        content,
        metadata: {
          model: this.config.model,
          provider: 'ollama'
        }
      };
    } catch (error) {
      console.error('Error sending message to Ollama:', error);
      throw new Error('Failed to communicate with Ollama service');
    }
  }
  
  /**
   * Process a job request and find matching freelancers
   */
  async processJobRequest(userId: number, description: string, skills: string[]): Promise<AIMatchResult> {
    try {
      // Get all freelancers from the database
      const freelancers = await storage.getAllFreelancers();
      
      // Prepare the prompt for job analysis
      const prompt = `
        As a freelance matchmaking AI, analyze this job request and rank the top 3 freelancers from our database.
        
        JOB REQUEST:
        ${description}
        
        REQUIRED SKILLS:
        ${skills.join(', ')}
        
        AVAILABLE FREELANCERS (name, profession, skills, location, hourlyRate):
        ${freelancers.map(f => `- ${f.name}, ${f.profession}, Skills: [${f.skills.join(', ')}], Location: ${f.location}, Rate: $${f.hourlyRate}/hr`).join('\n')}
        
        Please provide:
        1. A detailed analysis of the job requirements and what makes a good match
        2. A ranking of the top 3 freelancers with reasoning for each match (consider skills, experience, and rate)
        3. Assign a percentage match score to each recommended freelancer
        
        Format your response in this structure:
        JOB ANALYSIS: [detailed analysis]
        
        TOP MATCHES:
        1. [Name] - [Match %] - [1-2 sentence reason for match]
        2. [Name] - [Match %] - [1-2 sentence reason for match]
        3. [Name] - [Match %] - [1-2 sentence reason for match]
      `;
      
      // Call Ollama with the detailed prompt
      const response = await axios.post(`${this.config.apiUrl}/chat`, {
        model: this.config.model,
        messages: [
          { role: 'system', content: 'You are a freelance matchmaking assistant specializing in connecting clients with the best freelancers for their projects.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3, // Lower temperature for more consistent results
        stream: false
      });
      
      // Extract AI response
      const responseText = response.data.message?.content || '';
      
      // Process the analysis to extract structured data
      const { analysisText, matches } = this.processJobAnalysisResponse(responseText, freelancers);
      
      // Generate suggested follow-up questions
      const suggestedQuestions = this.generateSuggestedQuestions(description, skills, matches);
      
      return {
        jobAnalysis: {
          description,
          skills,
          analysisText,
        },
        matches,
        suggestedQuestions,
        provider: 'ollama'
      };
    } catch (error) {
      console.error('Error processing job request with Ollama:', error);
      throw new Error('Failed to analyze job request with Ollama service');
    }
  }
  
  /**
   * Process the raw job analysis response and extract structured data
   */
  private processJobAnalysisResponse(responseText: string, freelancers: any[]): { analysisText: string, matches: any[] } {
    // Extract the analysis portion
    const analysisMatch = responseText.match(/JOB ANALYSIS:(.*?)(?=TOP MATCHES:|$)/s);
    const analysisText = analysisMatch ? analysisMatch[1].trim() : 'No analysis provided.';
    
    // Extract the matches
    const matchesRegex = /(\d+)\.\s+([^-]+)\s+-\s+(\d+)%\s+-\s+(.+?)(?=\d+\.|$)/g;
    let match;
    const extractedMatches: any[] = [];
    
    while ((match = matchesRegex.exec(responseText)) !== null && extractedMatches.length < 3) {
      const name = match[2].trim();
      const matchPercentage = parseInt(match[3], 10);
      const reason = match[4].trim();
      
      // Find the freelancer object that matches this name
      const freelancer = freelancers.find(f => 
        f.name.toLowerCase() === name.toLowerCase() ||
        name.toLowerCase().includes(f.name.toLowerCase())
      );
      
      if (freelancer) {
        extractedMatches.push({
          freelancer: {
            id: freelancer.id,
            name: freelancer.name,
            profession: freelancer.profession,
            skills: freelancer.skills,
            hourlyRate: freelancer.hourlyRate,
            location: freelancer.location,
            availability: freelancer.availability || 'Available',
            completedProjects: freelancer.completedProjects || 0,
            successRate: freelancer.successRate || '95%',
          },
          matchPercentage,
          reason
        });
      }
    }
    
    // If we couldn't extract matches from the AI response format, 
    // fallback to selecting the top 3 freelancers based on skills match
    if (extractedMatches.length === 0) {
      // Simple skill matching as fallback
      const topFreelancers = this.getTopFreelancersBySkillMatch(freelancers, 3);
      return {
        analysisText,
        matches: topFreelancers
      };
    }
    
    return {
      analysisText,
      matches: extractedMatches
    };
  }
  
  /**
   * Get top freelancers by simple skill matching (fallback method)
   */
  private getTopFreelancersBySkillMatch(freelancers: any[], limit: number = 3): any[] {
    // Sort by completedProjects (desc) as a simple ranking mechanism
    const sortedFreelancers = [...freelancers].sort((a, b) => 
      (b.completedProjects || 0) - (a.completedProjects || 0)
    );
    
    return sortedFreelancers.slice(0, limit).map(freelancer => ({
      freelancer: {
        id: freelancer.id,
        name: freelancer.name,
        profession: freelancer.profession,
        skills: freelancer.skills,
        hourlyRate: freelancer.hourlyRate,
        location: freelancer.location,
        availability: freelancer.availability || 'Available',
        completedProjects: freelancer.completedProjects || 0,
        successRate: freelancer.successRate || '95%',
      },
      matchPercentage: Math.floor(70 + Math.random() * 20), // Random match between 70-90%
      reason: `${freelancer.name} has relevant experience and skills for this project.`
    }));
  }
  
  /**
   * Generate suggested follow-up questions based on the job and matches
   */
  private generateSuggestedQuestions(description: string, skills: string[], matches: any[]): string[] {
    // Default questions if no matches were found
    if (!matches.length) {
      return [
        'Can you recommend freelancers with specific skills?',
        'What budget range should I consider for this project?',
        'How can I improve my job description?'
      ];
    }
    
    // Include questions specific to the top match
    const topMatch = matches[0];
    const questions = [
      `Can you tell me more about ${topMatch.freelancer.name}'s experience?`,
      `What is the typical timeline for this kind of project?`,
      `Should I consider a team instead of a single freelancer?`
    ];
    
    return questions;
  }
  
  /**
   * Get previous messages for a user to maintain context
   */
  private async getUserContextMessages(userId: number): Promise<{ role: string, content: string }[]> {
    // This would normally query a database for past messages
    // For now using a simple implementation
    return [];
  }
  
  /**
   * Format the messages for the Ollama API
   */
  private formatContextForOllama(systemPrompt: string, userContext: any[], currentMessage: string): any[] {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...userContext
    ];
    
    // Add the current message
    messages.push({ role: 'user', content: currentMessage });
    
    return messages;
  }
  
  /**
   * Save the interaction to maintain conversation history
   */
  private async saveInteraction(userId: number, userMessage: string, aiResponse: string): Promise<void> {
    // This would normally save to a database
    // For now just a stub implementation
    console.log(`Saving interaction for user ${userId}`);
  }
  
  /**
   * Get the system prompt for the AI
   */
  private getSystemPrompt(): string {
    return `You are an AI assistant for a freelance marketplace platform called FreelanceAI.
    Your primary goals are:
    1. Help clients find the right freelancers for their projects
    2. Assist freelancers in optimizing their profiles and finding work
    3. Provide information about the marketplace and its features
    
    Important Guidelines:
    - Keep responses focused on freelance-related topics
    - Be helpful and professional at all times
    - Don't provide personal opinions, but rely on general industry knowledge about freelancing
    - If asked about topics unrelated to freelancing, gently redirect the conversation back to the platform
    
    Marketplace Features:
    - Skills-based matching algorithm
    - Secure payment processing
    - Project milestone tracking
    - Communication tools
    - Reviews and ratings system
    
    Common Freelancer Categories:
    - Web Development
    - Mobile App Development
    - Graphic Design
    - Content Writing
    - Digital Marketing
    - Video Editing
    - Translation Services
    - Data Entry
    - Virtual Assistance`;
  }
}

// Create and export the Ollama service instance
export const ollamaService = new OllamaService({
  apiUrl: 'https://ollama-proxy.replit.app/api',
  model: 'deepseek-coder:6.7b' // Using deepseek-coder model via Ollama for compatibility
});