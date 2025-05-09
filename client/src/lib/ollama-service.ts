import { apiRequest } from './queryClient';
import { AIMatchResult, AIChatResponse } from '@shared/ai-schemas';

// Response type for AI status check
interface AIStatusResponse {
  available: boolean;
}

/**
 * Check if the Ollama service is available
 */
export async function checkOllamaStatus(): Promise<boolean> {
  try {
    const response = await apiRequest('/ollama/status', {
      method: 'GET',
    }) as AIStatusResponse;
    return response.available;
  } catch (error) {
    console.error('Error checking Ollama status:', error);
    return false;
  }
}

/**
 * Send a message to the Ollama AI assistant
 */
export async function sendOllamaMessage(message: string, metadata?: Record<string, any>): Promise<AIChatResponse> {
  try {
    const response = await apiRequest('/ollama/message', {
      method: 'POST',
      body: JSON.stringify({ message, metadata }),
    }) as AIChatResponse;
    return response;
  } catch (error) {
    console.error('Error sending message to Ollama:', error);
    throw error;
  }
}

/**
 * Process a job request and find matching freelancers
 */
export async function analyzeJobRequestWithOllama(
  description: string, 
  skills: string[] = []
): Promise<AIMatchResult> {
  try {
    const response = await apiRequest('/ollama/job-analysis', {
      method: 'POST',
      body: JSON.stringify({ description, skills }),
    }) as AIMatchResult;
    return response;
  } catch (error) {
    console.error('Error analyzing job request with Ollama:', error);
    throw error;
  }
}