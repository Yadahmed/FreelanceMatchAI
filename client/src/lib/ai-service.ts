import { apiRequest } from './queryClient';
import { AIMatchResult, ChatResponse } from '@shared/ai-schemas';

/**
 * Check if the AI service is available
 */
export async function checkAIStatus(): Promise<boolean> {
  try {
    const response = await apiRequest<{ available: boolean }>('/ai/status', {
      method: 'GET',
    });
    return response.available;
  } catch (error) {
    console.error('Error checking AI status:', error);
    return false;
  }
}

/**
 * Send a message to the AI assistant
 */
export async function sendAIMessage(message: string, metadata?: Record<string, any>): Promise<ChatResponse> {
  try {
    const response = await apiRequest<ChatResponse>('/ai/message', {
      method: 'POST',
      data: { message, metadata },
    });
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
    const response = await apiRequest<AIMatchResult>('/ai/job-analysis', {
      method: 'POST',
      data: { description, skills },
    });
    return response;
  } catch (error) {
    console.error('Error analyzing job request:', error);
    throw error;
  }
}