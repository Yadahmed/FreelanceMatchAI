import { Request, Response } from 'express';
import { aiService } from '../services/ai-service';
import { deepseekService } from '../services/deepseek-service';
import { ollamaService } from '../services/ollama-service';
import { aiChatRequestSchema, jobAnalysisRequestSchema } from '@shared/ai-schemas';

/**
 * Controller for handling AI-related requests
 */

/**
 * Process a message sent to the AI assistant
 */
export async function processAIMessage(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Validate request body
    const { message } = aiChatRequestSchema.parse(req.body);
    const userId = req.user.id;

    // First try DeepSeek service
    const isDeepSeekAvailable = await deepseekService.checkAvailability();
    
    // If DeepSeek is available, use it
    if (isDeepSeekAvailable) {
      try {
        const aiResponse = await deepseekService.sendMessage(userId, message);
        return res.status(200).json({
          content: aiResponse.content,
          metadata: {
            ...aiResponse.metadata,
            provider: 'deepseek'
          }
        });
      } catch (deepseekError) {
        console.error('DeepSeek service error, trying fallback:', deepseekError);
        // Continue to fallback if DeepSeek fails
      }
    }
    
    // Try Ollama as fallback
    const isOllamaAvailable = await ollamaService.checkAvailability();
    
    if (isOllamaAvailable) {
      try {
        const ollamaResponse = await ollamaService.sendMessage(userId, message);
        return res.status(200).json({
          content: ollamaResponse.content,
          metadata: {
            ...ollamaResponse.metadata,
            provider: 'ollama',
            fallback: true
          }
        });
      } catch (ollamaError) {
        console.error('Ollama fallback service error:', ollamaError);
        // Continue to error response if Ollama also fails
      }
    }
    
    // If all AI services are unavailable or failed
    return res.status(503).json({ 
      message: 'All AI services are currently unavailable',
      fallback: true,
      content: 'I apologize, but our AI services are currently unavailable. We\'ve tried both DeepSeek and Ollama services without success. Please try again later.',
    });
  } catch (error: any) {
    console.error('Error processing AI message:', error);
    
    // Handle validation errors
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: 'Invalid request data', details: error.errors });
    }

    return res.status(500).json({ 
      message: error.message || 'Error processing your message',
      fallback: true,
      content: 'I apologize, but I encountered an error while processing your message. Please try again.'
    });
  }
}

/**
 * Process a job request and find matching freelancers
 */
export async function processJobRequest(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Validate request body
    const requestData = jobAnalysisRequestSchema.safeParse(req.body);
    
    if (!requestData.success) {
      return res.status(400).json({ 
        message: 'Invalid job request data',
        details: requestData.error.errors
      });
    }
    
    const { description, skills = [] } = requestData.data;
    const userId = req.user.id;
    
    // First try DeepSeek service
    const isDeepSeekAvailable = await deepseekService.checkAvailability();
    
    // If DeepSeek is available, use it
    if (isDeepSeekAvailable) {
      try {
        const result = await deepseekService.processJobRequest(userId, description, skills || []);
        
        // Add provider info to the result
        return res.status(200).json({
          ...result,
          provider: 'deepseek'
        });
      } catch (deepseekError) {
        console.error('DeepSeek job analysis error, trying fallback:', deepseekError);
        // Continue to fallback if DeepSeek fails
      }
    }
    
    // Try Ollama as fallback
    const isOllamaAvailable = await ollamaService.checkAvailability();
    
    if (isOllamaAvailable) {
      try {
        const result = await ollamaService.processJobRequest(userId, description, skills || []);
        
        // Add provider info to the result
        return res.status(200).json({
          ...result,
          provider: 'ollama',
          fallback: true
        });
      } catch (ollamaError) {
        console.error('Ollama job analysis error:', ollamaError);
        // Continue to error response if Ollama also fails
      }
    }
    
    // If all AI services are unavailable or failed
    return res.status(503).json({
      message: 'All AI services are currently unavailable',
      error: true,
      fallback: true,
      jobAnalysis: {
        description: description,
        skills: skills,
        analysisText: 'Job analysis unavailable. All AI services are currently offline.'
      },
      matches: [],
      suggestedQuestions: [
        'When will AI services be available again?',
        'Can I try again later?'
      ]
    });
  } catch (error: any) {
    console.error('Error processing job request:', error);
    return res.status(500).json({ 
      message: error.message || 'Error processing job request', 
      error: true
    });
  }
}

/**
 * Check if the AI service is available
 */
export async function checkAIStatus(req: Request, res: Response) {
  try {
    // Check all available AI services
    const isDeepseekAvailable = await deepseekService.checkAvailability();
    const isOllamaAvailable = await ollamaService.checkAvailability();
    const isOriginalAvailable = await aiService.checkAvailability();
    
    // Consider the AI available if either DeepSeek or Ollama is available
    const isAnyServiceAvailable = isDeepseekAvailable || isOllamaAvailable;
    
    return res.status(200).json({ 
      available: isAnyServiceAvailable, 
      services: {
        deepseek: isDeepseekAvailable,
        ollama: isOllamaAvailable,
        original: isOriginalAvailable
      },
      primaryService: isDeepseekAvailable ? 'deepseek' : (isOllamaAvailable ? 'ollama' : null)
    });
  } catch (error) {
    console.error('Error checking AI status:', error);
    return res.status(500).json({ 
      message: 'Error checking AI status', 
      available: false,
      services: {
        deepseek: false,
        ollama: false,
        original: false
      },
      primaryService: null
    });
  }
}