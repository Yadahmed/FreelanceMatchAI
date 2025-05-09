import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Send } from 'lucide-react';

export function DirectAIChat() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{available: boolean; services?: any}>({available: false});

  // Check AI status directly
  useEffect(() => {
    const checkStatus = async () => {
      try {
        console.log('Checking AI status directly...');
        const res = await fetch('/api/ai/status');
        const data = await res.json();
        console.log('Direct AI status check result:', data);
        setStatus(data);
      } catch (error) {
        console.error('Error checking AI status directly:', error);
      }
    };

    checkStatus();
  }, []);

  const handleSend = async () => {
    if (!message.trim() || loading) return;
    
    setLoading(true);
    try {
      console.log('Sending message directly:', message);
      
      // Get authentication token
      const token = localStorage.getItem('auth_token');
      
      const res = await fetch('/api/ai/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ message }),
        credentials: 'include'
      });
      
      const data = await res.json();
      console.log('AI response received:', data);
      
      if (res.ok) {
        setResponse(data.content);
      } else {
        setResponse(`Error: ${data.message || 'Failed to communicate with AI service'}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setResponse('Error: Failed to communicate with the server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Direct AI Chat Test</h3>
        <div className="text-sm">
          Status: {status.available ? 
            <span className="text-green-600">Available</span> : 
            <span className="text-red-600">Unavailable</span>
          }
          {status.services && (
            <div className="text-xs mt-1">
              Services: 
              <span className={status.services.deepseek ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                DeepSeek {status.services.deepseek ? '✓' : '✗'}
              </span>,
              <span className={status.services.ollama ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                Ollama {status.services.ollama ? '✓' : '✗'}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {response && (
        <div className="bg-muted p-3 rounded-md">
          <h4 className="text-sm font-medium mb-1">AI Response:</h4>
          <p className="text-sm whitespace-pre-wrap">{response}</p>
        </div>
      )}
      
      <div className="flex flex-col gap-2">
        <Textarea 
          placeholder="Enter a message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-[80px]"
        />
        <Button 
          onClick={handleSend} 
          disabled={loading || !message.trim()}
          className="self-end"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}