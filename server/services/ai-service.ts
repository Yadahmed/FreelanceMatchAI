import axios from 'axios';
import { env } from 'process';

// Configuration for connecting to the local DeepSeek R1 server
interface DeepSeekConfig {
  apiUrl: string;
  apiKey?: string; // Optional as local deployments might not require an API key
}

// Define the structure for chat messages
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Structure for chat history
export interface ChatHistory {
  userId: number;
  messages: ChatMessage[];
  metadata?: Record<string, any>; // Additional data like job preferences, etc.
}

// Response from the AI model
export interface AIResponse {
  content: string;
  metadata?: any; // Any additional data returned by the model
}

/**
 * Service for interacting with the DeepSeek R1 AI model
 */
export class AIService {
  private config: DeepSeekConfig;
  private chatHistories: Map<number, ChatHistory> = new Map();

  constructor(config?: Partial<DeepSeekConfig>) {
    // Default configuration points to localhost
    this.config = {
      apiUrl: config?.apiUrl || process.env.DEEPSEEK_API_URL || 'http://localhost:8000/v1',
      apiKey: config?.apiKey || process.env.DEEPSEEK_API_KEY
    };

    console.log('[AIService] Initialized with API URL:', this.config.apiUrl);
  }

  /**
   * Check if the DeepSeek R1 server is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      console.log('[AIService] Checking availability of DeepSeek R1 server...');
      // This endpoint might need to be adjusted based on the actual DeepSeek R1 API
      const response = await axios.get(`${this.config.apiUrl}/health`);
      return response.status === 200;
    } catch (error) {
      console.error('[AIService] DeepSeek R1 server is not available:', error);
      return false;
    }
  }

  /**
   * Get or create a chat history for a user
   */
  private getOrCreateChatHistory(userId: number): ChatHistory {
    if (!this.chatHistories.has(userId)) {
      this.chatHistories.set(userId, {
        userId,
        messages: [
          {
            role: 'system',
            content: `You are FreelanceMatchAI, an AI assistant for a freelance matchmaking platform. 
            Your goal is to help clients find the best freelancers for their projects and to assist 
            freelancers in finding suitable job opportunities. Be helpful, concise, and focus on 
            understanding the client's needs to make the best matches.`
          }
        ]
      });
    }
    return this.chatHistories.get(userId)!;
  }

  /**
   * Save chat history to persistent storage
   * This is a placeholder - in a real implementation, this would save to a database
   */
  private async saveChatHistory(userId: number, history: ChatHistory): Promise<void> {
    // In a real implementation, this would save to a database
    // For now, just update our in-memory map
    this.chatHistories.set(userId, history);
    console.log(`[AIService] Saved chat history for user ${userId}, message count: ${history.messages.length}`);
  }

  /**
   * Send a message to the DeepSeek R1 model
   */
  async sendMessage(userId: number, message: string): Promise<AIResponse> {
    try {
      // Get chat history for this user
      const chatHistory = this.getOrCreateChatHistory(userId);
      
      // Add user message to history
      chatHistory.messages.push({
        role: 'user',
        content: message
      });

      console.log(`[AIService] Sending message to DeepSeek R1 for user ${userId}`);
      
      // Structure the request according to DeepSeek R1's API
      const requestData = {
        model: "deepseek-r1", // Replace with the specific model name if different
        messages: chatHistory.messages,
        temperature: 0.7,
        max_tokens: 1000,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add API key if available
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      // Make the request to the DeepSeek R1 API
      const response = await axios.post(
        `${this.config.apiUrl}/chat/completions`, 
        requestData,
        { headers }
      );

      // Extract the assistant's response
      const aiResponse = response.data.choices[0].message.content;

      // Add AI response to chat history
      chatHistory.messages.push({
        role: 'assistant',
        content: aiResponse
      });

      // Save updated chat history
      await this.saveChatHistory(userId, chatHistory);

      return {
        content: aiResponse
      };
    } catch (error: any) {
      console.error('[AIService] Error sending message to DeepSeek R1:', error);
      
      // Provide meaningful error message
      let errorMessage = 'Failed to communicate with AI service.';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMessage = `AI service error: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
        console.error('[AIService] Response error data:', error.response.data);
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'AI service unavailable - no response received';
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Process a job request and find matching freelancers
   * This will use the AI to analyze the request and apply the weighted scoring algorithm
   */
  async processJobRequest(userId: number, jobDescription: string, skills: string[]): Promise<any> {
    try {
      const systemPrompt = `
        Analyze the following job request and extract key requirements:
        - Required skills
        - Project timeline
        - Budget constraints
        - Communication expectations
        - Special requirements

        Return the analysis in JSON format.
      `;

      // For now, just return a placeholder
      // In the real implementation, this would use DeepSeek R1 to analyze the job request
      // and then apply the weighted scoring algorithm to find matching freelancers
      return {
        analysis: "This is a placeholder for the DeepSeek R1 job analysis",
        matches: []
      };
    } catch (error) {
      console.error('[AIService] Error processing job request:', error);
      throw error;
    }
  }
}

// Export a singleton instance for use throughout the application
export const aiService = new AIService();