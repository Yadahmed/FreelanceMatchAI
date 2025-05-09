import { Router } from 'express';
import axios from 'axios';

const router = Router();

// Testing endpoint to check Ollama setup with custom URL
router.get('/status', async (req, res) => {
  try {
    const apiUrl = req.query.url as string || 'http://localhost:11434/api';
    
    console.log(`Testing Ollama at ${apiUrl}/tags`);
    
    // Add more detailed logging
    console.log('Full request URL:', `${apiUrl}/tags`);
    
    const response = await axios.get(`${apiUrl}/tags`, {
      // Add timeout to avoid hanging
      timeout: 10000,
      // Log the response type
      validateStatus: (status) => {
        console.log('Response status:', status);
        return true; // Don't throw error on any status
      }
    });
    
    // Log the response type
    console.log('Response type:', typeof response.data);
    console.log('Response headers:', response.headers);
    
    // Check if the response is valid JSON
    if (typeof response.data === 'string') {
      console.log('Response data (truncated):', response.data.substring(0, 100) + '...');
      
      // Try to parse it if string
      try {
        const parsed = JSON.parse(response.data);
        
        res.status(200).json({
          available: true,
          models: parsed.models || [],
          message: 'Ollama is available and working correctly!',
          responseType: 'string - parsed as JSON'
        });
        return;
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        
        res.status(200).json({
          available: false, 
          message: 'The endpoint returned HTML instead of JSON. Check if URL is correct and tunnel is properly configured.',
          details: response.data.substring(0, 100) + '...',
          url: req.query.url || 'http://localhost:11434/api'
        });
        return;
      }
    }
    
    // Valid JSON response
    res.status(200).json({
      available: true,
      models: response.data.models || [],
      message: 'Ollama is available and working correctly!',
      responseType: 'object'
    });
  } catch (error: any) {
    console.error('Test Ollama error:', error?.message || 'Unknown error');
    
    let errorMessage = error?.message || 'Failed to connect to Ollama';
    
    // Check for specific error types
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused. Make sure Ollama is running and the URL is correct.';
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Connection timed out. The server might be taking too long to respond.';
    } else if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      errorMessage = `Server responded with status ${error.response.status}: ${error.response.statusText}`;
    }
    
    res.status(200).json({
      available: false, 
      message: errorMessage,
      errorType: error.code || 'UNKNOWN',
      url: req.query.url || 'http://localhost:11434/api'
    });
  }
});

// Simple test to generate text
router.post('/generate', async (req, res) => {
  try {
    const { apiUrl, model, prompt } = req.body;
    
    if (!apiUrl || !model || !prompt) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        message: 'API URL, model name, and prompt are required' 
      });
    }
    
    console.log(`Testing generation with model ${model} at ${apiUrl}`);
    
    const response = await axios.post(`${apiUrl}/generate`, {
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9
      }
    });
    
    res.status(200).json({
      success: true,
      response: response.data.response,
      model: model,
      api: apiUrl
    });
  } catch (error: any) {
    console.error('Test generation error:', error?.message);
    
    if (error.response) {
      console.error('API response error:', error.response.data);
    }
    
    res.status(500).json({ 
      error: 'Failed to generate text',
      message: error?.message || 'Unknown error',
      details: error.response?.data || {}
    });
  }
});

export default router;