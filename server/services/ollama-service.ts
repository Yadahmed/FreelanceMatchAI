import axios from 'axios';
import { storage } from '../storage';
import { db } from '../db';
import { aiChatMessages, aiJobAnalyses } from '@shared/ai-schemas';
import { FreelancerMatch, AIMatchResult } from '@shared/ai-schemas';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

interface OllamaConfig {
  apiUrl: string;
  model: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatHistory {
  userId: number;
  messages: ChatMessage[];
  metadata?: Record<string, any>;
}

export interface AIResponse {
  content: string;
  metadata?: any;
}

/**
 * Service for interacting with Ollama AI models
 */
export class OllamaService {
  private config: OllamaConfig;
  private chatHistories: Map<number, ChatHistory> = new Map();
  
  constructor(config?: Partial<OllamaConfig>) {
    this.config = {
      apiUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434/api',
      model: process.env.OLLAMA_MODEL || 'llama3',
      ...config
    };
    
    console.log('OllamaService initialized with config:', {
      apiUrl: this.config.apiUrl,
      model: this.config.model
    });
  }
  
  /**
   * Check if the Ollama server is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      // Simple version check to see if Ollama is responding
      const response = await axios.get(`${this.config.apiUrl.replace('/api', '')}/api/version`, {
        timeout: 5000,
      });
      
      return response.status === 200;
    } catch (error) {
      console.error('Ollama availability check failed:', error);
      return false;
    }
  }
  
  /**
   * Get or create a chat history for a user
   */
  private async getOrCreateChatHistory(userId: number): Promise<ChatHistory> {
    // Check in-memory cache first
    if (this.chatHistories.has(userId)) {
      return this.chatHistories.get(userId)!;
    }
    
    // Try to load from database
    try {
      const messages = await db.select().from(aiChatMessages)
        .where(eq(aiChatMessages.userId, userId))
        .orderBy(aiChatMessages.timestamp);
      
      if (messages.length > 0) {
        // Convert DB messages to chat history format
        const conversationId = messages[0].conversationId;
        const chatHistory: ChatHistory = {
          userId,
          messages: messages.map(msg => ({
            role: msg.role as 'system' | 'user' | 'assistant',
            content: msg.content
          })),
          metadata: messages[0].metadata as Record<string, any> || {}
        };
        
        this.chatHistories.set(userId, chatHistory);
        return chatHistory;
      }
    } catch (error) {
      console.error('Error loading chat history from database:', error);
    }
    
    // Create new chat history with system prompt
    const systemPrompt = `You are FreelanceAI, an intelligent assistant for a freelance marketplace.
Your role is to help clients find the best freelancers for their projects and to assist freelancers in finding suitable jobs.
You should be professional, helpful, and concise in your responses.
Always prioritize matching the right freelancer with the right job based on skills, experience, and availability.
You can analyze job requests and provide recommendations based on the weighted scoring system:
- Job Performance (50%): Past success on similar projects 
- Skills & Experience (20%): Relevant skills and years of experience
- Responsiveness & Availability (15%): How quickly they respond and their current availability
- Fairness Boost (15%): Boosting newer freelancers with fewer reviews to give everyone a fair chance

Current date: ${new Date().toISOString().split('T')[0]}`;

    const newHistory: ChatHistory = {
      userId,
      messages: [
        { role: 'system', content: systemPrompt }
      ],
      metadata: {}
    };
    
    this.chatHistories.set(userId, newHistory);
    return newHistory;
  }
  
  /**
   * Save chat history to persistent storage
   */
  private async saveChatHistory(userId: number, history: ChatHistory): Promise<void> {
    try {
      // Generate a conversation ID if none exists
      const conversationId = history.metadata?.conversationId || uuidv4();
      
      // Save the system message if this is a new conversation
      if (!history.metadata?.conversationId) {
        // Update metadata with conversation ID
        history.metadata = {
          ...history.metadata,
          conversationId
        };
        
        // Save system message
        await db.insert(aiChatMessages).values({
          userId,
          role: history.messages[0].role,
          content: history.messages[0].content,
          conversationId,
          metadata: history.metadata || {}
        });
      }
      
      // Save the latest message (assuming it's at the end of the messages array)
      const latestMessage = history.messages[history.messages.length - 1];
      
      await db.insert(aiChatMessages).values({
        userId,
        role: latestMessage.role,
        content: latestMessage.content,
        conversationId,
        metadata: history.metadata || {}
      });
      
      // Update cache
      this.chatHistories.set(userId, history);
      
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }
  
  /**
   * Send a message to Ollama
   */
  async sendMessage(userId: number, message: string): Promise<AIResponse> {
    // Get chat history for this user
    const history = await this.getOrCreateChatHistory(userId);
    
    // Add user message to history
    history.messages.push({
      role: 'user',
      content: message
    });
    
    // Save user message to database
    await this.saveChatHistory(userId, history);
    
    try {
      // Convert chat format to Ollama format
      const ollamaMessages = history.messages.map(msg => {
        return {
          role: msg.role,
          content: msg.content
        };
      });
      
      // Prepare the request to Ollama
      const response = await axios.post(`${this.config.apiUrl}/chat`, {
        model: this.config.model,
        messages: ollamaMessages,
        stream: false,
        options: {
          temperature: 0.7,
        }
      });
      
      // Extract the assistant's response
      const assistantMessage = response.data.message;
      
      // Add assistant's response to history
      history.messages.push({
        role: 'assistant',
        content: assistantMessage.content
      });
      
      // Save assistant message to database
      await this.saveChatHistory(userId, history);
      
      return {
        content: assistantMessage.content,
        metadata: {}
      };
    } catch (error: any) {
      console.error('Error sending message to Ollama:', error);
      
      // For non-availability errors, provide more context
      if (error.response) {
        throw new Error(`Ollama API error: ${error.response.status} - ${error.response.data?.error || error.message}`);
      } else if (error.request) {
        throw new Error('Ollama not responding. Check if the server is running.');
      }
      
      throw error;
    }
  }
  
  /**
   * Process a job request and find matching freelancers
   */
  async processJobRequest(userId: number, jobDescription: string, skills: string[]): Promise<AIMatchResult> {
    // Get all freelancers from storage
    const allFreelancers = await storage.getAllFreelancers();
    
    // First, analyze the job request using Ollama
    const jobAnalysis = await this.analyzeJobRequest(userId, jobDescription, skills);
    
    // Then, score each freelancer using our weighted algorithm
    const matches: FreelancerMatch[] = allFreelancers.map(freelancer => {
      // Job Performance (50%)
      const jobPerformanceScore = Math.min(freelancer.jobPerformance / 10, 10);
      
      // Skills & Experience (20%)
      const skillsScore = this.calculateSkillsScore(freelancer.skills, skills);
      
      // Responsiveness (15%)
      const responsivenessScore = Math.min(freelancer.responsiveness / 10, 10);
      
      // Fairness boost (15%) - boost newer freelancers
      const fairnessScore = this.calculateFairnessScore(freelancer.completedJobs);
      
      // Calculate weighted score
      const totalScore = (
        jobPerformanceScore * 0.5 +
        skillsScore * 0.2 +
        responsivenessScore * 0.15 +
        fairnessScore * 0.15
      );
      
      // Generate match reasons
      const matchReasons = [];
      if (jobPerformanceScore > 7) matchReasons.push('Excellent job performance history');
      if (skillsScore > 7) matchReasons.push('Strong skill match for this project');
      if (responsivenessScore > 7) matchReasons.push('Highly responsive to client requests');
      if (fairnessScore > 7) matchReasons.push('Promising talent worth considering');
      
      return {
        freelancerId: freelancer.id,
        score: Number(totalScore.toFixed(2)),
        matchReasons,
        jobPerformanceScore: Number(jobPerformanceScore.toFixed(2)),
        skillsScore: Number(skillsScore.toFixed(2)),
        responsivenessScore: Number(responsivenessScore.toFixed(2)),
        fairnessScore: Number(fairnessScore.toFixed(2))
      };
    });
    
    // Sort by score (descending)
    matches.sort((a, b) => b.score - a.score);
    
    // Take top matches
    const topMatches = matches.slice(0, 3);
    
    // Generate suggested follow-up questions
    const suggestedQuestions = await this.generateSuggestedQuestions(jobDescription, skills);
    
    // Create the result
    const result: AIMatchResult = {
      jobAnalysis,
      matches: topMatches,
      suggestedQuestions
    };
    
    // Save the analysis to the database
    try {
      await db.insert(aiJobAnalyses).values({
        userId,
        analysis: jobAnalysis,
        matches: topMatches,
        suggestedQuestions
      });
    } catch (error) {
      console.error('Error saving job analysis:', error);
    }
    
    return result;
  }
  
  /**
   * Analyze a job request to understand requirements and priorities
   */
  private async analyzeJobRequest(userId: number, jobDescription: string, skills: string[]): Promise<Record<string, any>> {
    try {
      // Prepare the system message specifically for job analysis
      const systemMessage = `You are a job analysis AI that helps understand and categorize job requirements. 
      Analyze the following job description and extract key information such as required skills, 
      estimated complexity, project duration, and any special requirements.
      Provide a structured analysis that can be used to match with freelancers.`;
      
      // Create messages for Ollama
      const messages = [
        { role: 'system', content: systemMessage },
        { role: 'user', content: `Please analyze this job request: ${jobDescription}\nMentioned skills: ${skills.join(', ')}` }
      ];
      
      // Make API request to Ollama
      const response = await axios.post(`${this.config.apiUrl}/chat`, {
        model: this.config.model,
        messages,
        stream: false,
        options: {
          temperature: 0.3 // Lower temperature for more deterministic analysis
        }
      });
      
      // Extract the analysis
      const analysisText = response.data.message.content;
      
      // Convert the analysis text into a structured object
      const analysisObject: Record<string, any> = {
        raw: analysisText,
        extractedSkills: skills,
        complexity: this.extractComplexity(analysisText),
        estimatedDuration: this.extractDuration(analysisText),
        budget: this.extractBudget(analysisText)
      };
      
      return analysisObject;
    } catch (error) {
      console.error('Error analyzing job request:', error);
      
      // Return a basic analysis if AI processing fails
      return {
        raw: "Failed to analyze with AI",
        extractedSkills: skills,
        complexity: "medium",
        estimatedDuration: "unknown",
        budget: "unknown"
      };
    }
  }
  
  /**
   * Generate suggested follow-up questions for a job request
   */
  private async generateSuggestedQuestions(jobDescription: string, skills: string[]): Promise<string[]> {
    try {
      // Prepare the system message specifically for question generation
      const systemMessage = `You are an assistant helping clients clarify their job requests. 
      Based on the following job description, generate 3 follow-up questions that would help clarify requirements, 
      timeline, budget, or other important factors. Format each question on a new line.`;
      
      // Create messages for Ollama
      const messages = [
        { role: 'system', content: systemMessage },
        { role: 'user', content: `Job description: ${jobDescription}\nMentioned skills: ${skills.join(', ')}` }
      ];
      
      // Make API request to Ollama
      const response = await axios.post(`${this.config.apiUrl}/chat`, {
        model: this.config.model,
        messages,
        stream: false,
        options: {
          temperature: 0.7
        }
      });
      
      // Extract the questions
      const questionsText = response.data.message.content;
      
      // Split into separate questions and clean them up
      const questions = questionsText
        .split('\n')
        .filter(line => line.trim().length > 0 && line.includes('?'))
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .slice(0, 3);
      
      return questions;
    } catch (error) {
      console.error('Error generating suggested questions:', error);
      
      // Return default questions if AI processing fails
      return [
        "What is your expected timeline for this project?",
        "Do you have a specific budget range in mind?",
        "What would you consider a successful outcome for this project?"
      ];
    }
  }
  
  /**
   * Calculate a score for skills matching
   */
  private calculateSkillsScore(freelancerSkills: string[], requestedSkills: string[]): number {
    if (!requestedSkills || requestedSkills.length === 0) {
      return 7; // Default score if no specific skills requested
    }
    
    // Normalize skills for comparison
    const normalizedFreelancerSkills = freelancerSkills.map(s => s.toLowerCase());
    const normalizedRequestedSkills = requestedSkills.map(s => s.toLowerCase());
    
    // Count matches
    let matches = 0;
    for (const skill of normalizedRequestedSkills) {
      if (normalizedFreelancerSkills.includes(skill)) {
        matches++;
      }
    }
    
    // Calculate percentage match
    const matchPercentage = (matches / normalizedRequestedSkills.length) * 100;
    
    // Convert to 0-10 scale
    return Math.min(Math.round(matchPercentage / 10), 10);
  }
  
  /**
   * Calculate a fairness boost score
   * This gives newer freelancers with fewer completed jobs a boost
   */
  private calculateFairnessScore(completedJobs: number): number {
    // Inverse relationship - fewer jobs gets higher score
    if (completedJobs <= 5) return 10;
    if (completedJobs <= 10) return 8;
    if (completedJobs <= 20) return 6;
    if (completedJobs <= 50) return 4;
    return 2; // Very experienced freelancers get less fairness boost
  }
  
  /**
   * Extract project complexity from analysis text
   */
  private extractComplexity(text: string): string {
    const lowMatch = text.match(/simple|basic|straightforward|easy|low complexity/i);
    const highMatch = text.match(/complex|advanced|sophisticated|difficult|challenging|high complexity/i);
    
    if (highMatch) return "high";
    if (lowMatch) return "low";
    return "medium";
  }
  
  /**
   * Extract estimated duration from analysis text
   */
  private extractDuration(text: string): string {
    // Look for patterns like "2-3 weeks", "1 month", etc.
    const durationMatch = text.match(/(\d+)(-\d+)?\s*(day|days|week|weeks|month|months)/i);
    
    if (durationMatch) {
      return durationMatch[0];
    }
    
    return "undetermined";
  }
  
  /**
   * Extract budget from analysis text
   */
  private extractBudget(text: string): string {
    // Look for patterns like "$500", "$1,000-$2,000", etc.
    const budgetMatch = text.match(/\$\d{1,3}(,\d{3})*(\s*-\s*\$\d{1,3}(,\d{3})*)*/i);
    
    if (budgetMatch) {
      return budgetMatch[0];
    }
    
    return "undetermined";
  }
}

// Create and export a singleton instance
export const ollamaService = new OllamaService();