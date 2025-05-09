import { Request, Response } from 'express';
import { aiService } from '../services/ai-service';
import { deepseekService } from '../services/deepseek-service';
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

    // Check if DeepSeek service is available
    const isAvailable = await deepseekService.checkAvailability();
    
    if (!isAvailable) {
      // Return fallback response if AI service is not available
      return res.status(503).json({ 
        message: 'AI service is currently unavailable',
        fallback: true,
        content: 'I apologize, but our AI service is currently unavailable. Please try again later.',
      });
    }

    // Process the message with DeepSeek service
    const aiResponse = await deepseekService.sendMessage(userId, message);
    
    return res.status(200).json({
      content: aiResponse.content,
      metadata: aiResponse.metadata
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
    
    // Process the job request using the DeepSeek service
    const result = await deepseekService.processJobRequest(userId, description, skills || []);
    
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error processing job request:', error);
    return res.status(500).json({ message: error.message || 'Error processing job request' });
  }
}

/**
 * Check if the AI service is available
 */
export async function checkAIStatus(req: Request, res: Response) {
  try {
    // Check the status of the DeepSeek service
    const isDeepseekAvailable = await deepseekService.checkAvailability();
    
    // For backward compatibility, also check the original AI service
    const isOriginalAvailable = await aiService.checkAvailability();
    
    return res.status(200).json({ 
      available: isDeepseekAvailable, 
      services: {
        deepseek: isDeepseekAvailable,
        original: isOriginalAvailable
      }
    });
  } catch (error) {
    console.error('Error checking AI status:', error);
    return res.status(500).json({ 
      message: 'Error checking AI status', 
      available: false,
      services: {
        deepseek: false,
        original: false
      } 
    });
  }
}