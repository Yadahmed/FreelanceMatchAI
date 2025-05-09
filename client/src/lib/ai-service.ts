import { apiRequest } from './queryClient';
import { AIMatchResult, AIChatResponse } from '@shared/ai-schemas';

// Response type for AI status check
interface AIStatusResponse {
  available: boolean;
  services?: {
    deepseek: boolean;
    ollama: boolean;
    original: boolean;
  };
  primaryService?: 'deepseek' | 'ollama' | null;
}

/**
 * Check if the AI service is available
 * @param getDetailed If true, returns the full status response with service details
 */
export async function checkAIStatus(getDetailed = false): Promise<boolean | AIStatusResponse> {
  try {
    const response = await apiRequest('/ai/status', {
      method: 'GET',
    }) as AIStatusResponse;
    
    if (getDetailed) {
      return response;
    }
    
    return response.available;
  } catch (error) {
    console.error('Error checking AI status:', error);
    if (getDetailed) {
      return {
        available: false,
        services: {
          deepseek: false,
          ollama: false,
          original: false
        },
        primaryService: null
      };
    }
    return false;
  }
}

/**
 * Send a message to the AI assistant
 */
export async function sendAIMessage(message: string, metadata?: Record<string, any>): Promise<AIChatResponse> {
  try {
    const response = await apiRequest('/ai/message', {
      method: 'POST',
      body: JSON.stringify({ message, metadata }),
    }) as AIChatResponse;
    return response;
  } catch (error) {
    console.error('Error sending message to AI:', error);
    throw error;
  }
}

/**
 * Process a job request and find matching freelancers
 */
export async function analyzeJobRequest(
  description: string, 
  skills: string[] = []
): Promise<AIMatchResult> {
  try {
    const response = await apiRequest('/ai/job-analysis', {
      method: 'POST',
      body: JSON.stringify({ description, skills }),
    }) as AIMatchResult;
    return response;
  } catch (error) {
    console.error('Error analyzing job request:', error);
    throw error;
  }
}