import { Router } from 'express';
import axios from 'axios';

const router = Router();

// Testing endpoint to check Ollama setup with custom URL
router.get('/status', async (req, res) => {
  try {
    const apiUrl = req.query.url as string || 'http://localhost:11434/api';
    
    console.log(`Testing Ollama at ${apiUrl}/tags`);
    
    const response = await axios.get(`${apiUrl}/tags`);
    
    res.status(200).json({
      available: true,
      models: response.data.models || [],
      message: 'Ollama is available and working correctly!'
    });
  } catch (error: any) {
    console.error('Test Ollama error:', error?.message || 'Unknown error');
    
    res.status(200).json({
      available: false, 
      message: error?.message || 'Failed to connect to Ollama',
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