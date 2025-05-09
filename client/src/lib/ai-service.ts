import { apiRequest } from './queryClient';
import { AIMatchResult, AIChatResponse } from '@shared/ai-schemas';

// Response type for AI status check
interface AIStatusResponse {
  available: boolean;
  services?: {
    deepseek: boolean;
    anthropic: boolean;
    ollama: boolean;
    original: boolean;
  };
  primaryService?: 'deepseek' | 'anthropic' | 'ollama' | null;
}

/**
 * Check if the AI service is available
 * @param getDetailed If true, returns the full status response with service details
 */
export async function checkAIStatus(getDetailed = false): Promise<boolean | AIStatusResponse> {
  try {
    console.log('Checking AI status...');
    
    // Make a direct fetch call to avoid any authentication issues
    const res = await fetch('/api/ai/status', {
      method: 'GET',
      credentials: 'include',
    });
    
    if (!res.ok) {
      throw new Error(`Failed to check AI status: ${res.status}`);
    }
    
    const response = await res.json() as AIStatusResponse;
    console.log('Raw AI status response:', response);
    
    // Force the services to be available in development mode
    const forcedAvailable = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
    
    // Ensure response has expected structure with default values for missing properties
    const normalizedResponse: AIStatusResponse = {
      available: forcedAvailable || Boolean(response?.available),
      services: {
        deepseek: forcedAvailable || Boolean(response?.services?.deepseek),
        anthropic: forcedAvailable || Boolean(response?.services?.anthropic),
        ollama: forcedAvailable || Boolean(response?.services?.ollama),
        original: Boolean(response?.services?.original)
      },
      primaryService: response?.primaryService || (forcedAvailable ? 'anthropic' : null)
    };
    
    // Force AI to be available if at least one service is available,
    // even if the backend says it's not
    const services = normalizedResponse.services || { 
      deepseek: false, 
      anthropic: false,
      ollama: false, 
      original: false 
    };
    const anyServiceAvailable = services.deepseek || services.anthropic || services.ollama || services.original;
      
    if (anyServiceAvailable && !normalizedResponse.available) {
      console.log('Services available but status reports unavailable, correcting...');
      normalizedResponse.available = true;
      
      // Set primary service if not set
      if (!normalizedResponse.primaryService) {
        if (services.deepseek) {
          normalizedResponse.primaryService = 'deepseek';
        } else if (services.ollama) {
          normalizedResponse.primaryService = 'ollama';
        }
      }
    }
    
    console.log('Normalized AI status:', normalizedResponse);
    
    if (getDetailed) {
      return normalizedResponse;
    }
    
    return normalizedResponse.available;
  } catch (error) {
    console.error('Error checking AI status:', error);
    if (getDetailed) {
      return {
        available: false,
        services: {
          deepseek: false,
          anthropic: false,
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
    console.log('Sending job analysis request with:', { description, skills });
    const response = await apiRequest('/ai/job-analysis', {
      method: 'POST',
      body: JSON.stringify({ description, skills }),
    }) as AIMatchResult;
    console.log('Job analysis response:', response);
    return response;
  } catch (error) {
    console.error('Error analyzing job request:', error);
    throw error;
  }
}