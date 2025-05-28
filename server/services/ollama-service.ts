import { AIMatchResult, AIChatResponse } from '@shared/ai-schemas';
import { storage } from '../storage';

/**
 * A simplified fallback service that doesn't rely on external API connections
 * This provides basic AI-like functionality when the main DeepSeek service is unavailable
 */
class OllamaService {
  private readonly modelName: string = 'ollama-fallback';
  
  constructor() {
    console.log('OllamaService initialized as local fallback');
  }
  
  /**
   * Always return true since this is a local fallback implementation
   */
  async checkAvailability(): Promise<boolean> {
    return true;
  }
  
  /**
   * Generate a response to the user message
   */
  async sendMessage(userId: number, message: string): Promise<AIChatResponse> {
    try {
      console.log(`[OllamaFallback] Processing message for user ${userId}: ${message.substring(0, 50)}...`);
      
      const content = this.generateResponse(message);
      
      return {
        content,
        metadata: {
          model: this.modelName,
          provider: 'ollama'
        }
      };
    } catch (error) {
      console.error('[OllamaFallback] Error generating response:', error);
      throw new Error('Failed to generate response with fallback service');
    }
  }
  
  /**
   * Process a job request and find matching freelancers
   */
  async processJobRequest(userId: number, description: string, skills: string[]): Promise<AIMatchResult> {
    try {
      console.log(`[OllamaFallback] Processing job request for user ${userId}`);
      
      // Get all freelancers from the database
      const freelancers = await storage.getAllFreelancers();
      
      // Generate a simple analysis
      const analysisText = this.generateJobAnalysis(description, skills);
      
      // Find top matches using a simplified approach
      const matches = this.getTopFreelancersBySkillMatch(freelancers, skills, 3);
      
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
      } as any; // Using 'as any' to bypass TypeScript strictness for now
    } catch (error) {
      console.error('[OllamaFallback] Error processing job request:', error);
      throw new Error('Failed to analyze job request with fallback service');
    }
  }
  
  /**
   * Generate a response to the user message
   */
  private generateResponse(message: string): string {
    // Basic logic to understand the intent of the message
    const lowerMessage = message.toLowerCase();
    
    // Check for common patterns in messages
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi ') || lowerMessage.includes('hey')) {
      return "Hello! I'm the FreelanceMatchAI assistant (running in fallback mode). How can I help you with finding freelancers or understanding our marketplace today?";
    }
    
    if (lowerMessage.includes('find freelancer') || lowerMessage.includes('looking for')) {
      return "I'd be happy to help you find a freelancer. To provide the best matches, could you please tell me more about your project requirements and any specific skills you're looking for?";
    }
    
    if (lowerMessage.includes('how does') && lowerMessage.includes('work')) {
      return "Our freelance marketplace connects clients with talented professionals across various fields. The platform uses an advanced matching algorithm to suggest the best freelancers for your specific project needs, considering skills, experience, and performance ratings. You can browse profiles, communicate directly with freelancers, and manage projects all in one place. Please note I'm currently running in fallback mode, so some advanced features may be limited.";
    }
    
    // Default response
    return "I understand you're interested in our freelance marketplace. I'm currently running in fallback mode with limited capabilities. Could you ask a specific question about finding freelancers, understanding how our platform works, or creating a project?";
  }
  
  /**
   * Generate a simple job analysis
   */
  private generateJobAnalysis(description: string, skills: string[]): string {
    const skillsText = skills.length > 0 
      ? `The project requires expertise in ${skills.join(', ')}.` 
      : 'The project description does not specify required skills explicitly.';
    
    return `This job appears to be a ${this.detectJobType(description)} project. ${skillsText} A successful freelancer for this role would need relevant experience, strong communication skills, and the ability to deliver quality work on time.`;
  }
  
  /**
   * Detect the type of job from the description
   */
  private detectJobType(description: string): string {
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('website') || lowerDesc.includes('web ') || lowerDesc.includes('html') || lowerDesc.includes('css')) {
      return 'web development';
    }
    
    if (lowerDesc.includes('app') || lowerDesc.includes('mobile') || lowerDesc.includes('ios') || lowerDesc.includes('android')) {
      return 'mobile app development';
    }
    
    if (lowerDesc.includes('design') || lowerDesc.includes('logo') || lowerDesc.includes('ui') || lowerDesc.includes('ux')) {
      return 'design';
    }
    
    if (lowerDesc.includes('write') || lowerDesc.includes('content') || lowerDesc.includes('article') || lowerDesc.includes('blog')) {
      return 'content writing';
    }
    
    if (lowerDesc.includes('market') || lowerDesc.includes('seo') || lowerDesc.includes('ads') || lowerDesc.includes('campaign')) {
      return 'marketing';
    }
    
    return 'specialized';
  }
  
  /**
   * Get top freelancers by matching their skills with required skills
   */
  private getTopFreelancersBySkillMatch(freelancers: any[], requiredSkills: string[], limit: number = 3): any[] {
    // Calculate a simple match score for each freelancer
    const scoredFreelancers = freelancers.map(freelancer => {
      let skillsMatched = 0;
      
      // Count matching skills (case-insensitive)
      if (requiredSkills.length > 0) {
        const lowerRequiredSkills = requiredSkills.map(s => s.toLowerCase());
        const lowerFreelancerSkills = freelancer.skills.map(s => s.toLowerCase());
        
        lowerRequiredSkills.forEach(skill => {
          if (lowerFreelancerSkills.some(s => s.includes(skill) || skill.includes(s))) {
            skillsMatched++;
          }
        });
      }
      
      const skillsScore = requiredSkills.length > 0 
        ? (skillsMatched / requiredSkills.length) * 100 
        : 50; // If no skills specified, give a middle score
      
      // Include experience and rating in the score
      const experienceScore = freelancer.yearsOfExperience || 0;
      const ratingScore = freelancer.rating || 0;
      
      // Calculate total score (weighted)
      const totalScore = (skillsScore * 0.5) + (experienceScore * 10 * 0.3) + (ratingScore * 20 * 0.2);
      
      return {
        freelancer,
        score: totalScore
      };
    });
    
    // Sort by score (desc)
    scoredFreelancers.sort((a, b) => b.score - a.score);
    
    // Take the top matches and format them
    return scoredFreelancers.slice(0, limit).map(item => {
      const matchPercentage = Math.min(95, Math.round(item.score));
      
      return {
        freelancer: {
          id: item.freelancer.id,
          name: item.freelancer.name,
          profession: item.freelancer.profession,
          skills: item.freelancer.skills,
          hourlyRate: item.freelancer.hourlyRate,
          location: item.freelancer.location,
          availability: 'Available',
          completedProjects: item.freelancer.completedProjects || 0,
          successRate: '95%',
        },
        matchPercentage,
        reason: `${item.freelancer.name} has relevant skills and experience for this ${this.detectJobType(item.freelancer.profession)} project.`
      };
    });
  }
  
  /**
   * Generate suggested follow-up questions
   */
  private generateSuggestedQuestions(description: string, skills: string[], matches: any[]): string[] {
    // Default questions if no matches were found
    if (!matches.length) {
      return [
        'What specific skills are important for your project?',
        'What budget range are you considering for this work?',
        'When do you need this project completed by?'
      ];
    }
    
    // Include questions specific to the top match
    const topMatch = matches[0];
    const questions = [
      `Would you like more information about ${topMatch.freelancer.name}'s experience?`,
      `What timeline are you considering for this project?`,
      `Do you have a specific budget range in mind?`
    ];
    
    return questions;
  }
}

// Create and export the Ollama service instance
export const ollamaService = new OllamaService();