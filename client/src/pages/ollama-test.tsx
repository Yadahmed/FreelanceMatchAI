import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, InfoIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';

export default function OllamaTestPage() {
  const [apiUrl, setApiUrl] = useState('http://localhost:11434/api');
  const [model, setModel] = useState('deepseek-coder:6.7b');
  const [prompt, setPrompt] = useState('Write a simple React component that displays a counter with increment and decrement buttons.');
  const [response, setResponse] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const checkStatus = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    
    try {
      const encodedUrl = encodeURIComponent(apiUrl);
      const result = await apiRequest(`/test-ollama/status?url=${encodedUrl}`, {
        method: 'GET'
      });
      
      setIsAvailable(result.available);
      setStatusMessage(result.message);
      
      if (result.available) {
        console.log('Ollama models available:', result.models);
      }
    } catch (error: any) {
      console.error('Error checking Ollama status:', error);
      setIsAvailable(false);
      setStatusMessage(error.message || 'Failed to check Ollama status');
    } finally {
      setIsLoading(false);
    }
  };

  const generateText = async () => {
    if (!apiUrl.trim() || !model.trim() || !prompt.trim()) return;
    
    setIsGenerating(true);
    setResponse('');
    
    try {
      const result = await apiRequest('/test-ollama/generate', {
        method: 'POST',
        body: JSON.stringify({
          apiUrl,
          model,
          prompt
        })
      });
      
      setResponse(result.response || 'No response received');
    } catch (error: any) {
      console.error('Error generating text:', error);
      setResponse(`Error: ${error.message || 'Failed to generate text'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Ollama DeepSeek Test</h1>
        
        <div className="grid gap-8 md:grid-cols-[1fr_1fr]">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Ollama Connection</h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="api-url">Ollama API URL</Label>
                <Input 
                  id="api-url" 
                  placeholder="http://localhost:11434/api" 
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                />
                <div className="text-xs text-muted-foreground mt-1 space-y-1">
                  <p>For local Ollama: <code>http://localhost:11434/api</code></p>
                  <p>For localtunnel: <code>https://your-tunnel-url.loca.lt/api</code></p>
                  <p>Make sure to include <code>/api</code> at the end of the URL</p>
                </div>
              </div>
              
              <Button 
                onClick={checkStatus}
                disabled={isLoading || !apiUrl.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Check Ollama Status'
                )}
              </Button>
              
              {statusMessage && (
                <Alert variant={isAvailable ? "default" : "destructive"} className="mt-4">
                  <InfoIcon className="h-4 w-4" />
                  <AlertDescription>{statusMessage}</AlertDescription>
                </Alert>
              )}
            </div>
            
            <div className="mt-8 space-y-4">
              <h2 className="text-xl font-bold mb-4">Generate Text</h2>
              
              <div>
                <Label htmlFor="model">Model</Label>
                <Input 
                  id="model" 
                  placeholder="Model name" 
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea 
                  id="prompt" 
                  placeholder="Enter your prompt here..." 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={5}
                />
              </div>
              
              <Button 
                onClick={generateText}
                disabled={isGenerating || !apiUrl.trim() || !model.trim() || !prompt.trim()}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate'
                )}
              </Button>
            </div>
          </Card>
          
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Response</h2>
            
            <div className="relative">
              <Textarea 
                value={response} 
                readOnly 
                className="min-h-[500px] font-mono text-sm"
                placeholder="Response will appear here..."
              />
              
              {isGenerating && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="mt-2">Generating response...</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}