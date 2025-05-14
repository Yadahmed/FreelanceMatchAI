import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, InfoIcon, AlertTriangleIcon, Sparkles } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { checkAIStatus } from '@/lib/ai-service';

/**
 * DirectChat component for direct testing of the AI service
 * This component bypasses the normal AI chat flow and directly tests the backend AI service
 */
export default function DirectChatPage() {
  const [message, setMessage] = useState('Tell me about the freelancer platform you can help with.');
  const [response, setResponse] = useState('');
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  
  useEffect(() => {
    // Check if we have an auth token in localStorage
    const token = localStorage.getItem('auth_token');
    setAuthToken(token);
    
    // Check AI service status on mount
    checkAIServiceStatus();
  }, []);
  
  const checkAIServiceStatus = async () => {
    try {
      const result = await checkAIStatus(true);
      setAiStatus(result);
      console.log('AI service status:', result);
    } catch (error) {
      console.error('Error checking AI status:', error);
      setAiStatus({ available: false });
    }
  };
  
  const sendDirectMessage = async () => {
    if (!message.trim()) return;
    
    setIsLoading(true);
    setResponse('');
    
    try {
      const result = await apiRequest('/api/ai/message', {
        method: 'POST',
        body: JSON.stringify({ 
          message,
          metadata: { direct: true }
        })
      });
      
      if (result.content) {
        // Normal API response
        setResponse(result.content);
      } else if (result.response) {
        // Legacy API response format
        setResponse(result.response);
      } else {
        // No recognizable response format
        console.warn('Unrecognized API response format:', result);
        setResponse('No response content received. See console for details.');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      setResponse(`Error: ${error.message || 'Failed to get response'}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Improve the current prompt using AI assistance
   * This helps users craft better prompts to get more relevant responses
   */
  const improvePrompt = async () => {
    if (!message.trim()) return;
    
    setIsImprovingPrompt(true);
    
    try {
      // Ask the AI to improve the prompt for better results
      const result = await apiRequest('/api/ai/message', {
        method: 'POST',
        body: JSON.stringify({ 
          message: `Please rewrite the following prompt to be more effective for our freelance marketplace AI assistant. Make it specific, detailed, and clear: "${message}"`,
          metadata: { 
            direct: true,
            system: "You are a helpful AI prompt improvement assistant. Your task is to rewrite user messages to be more effective when communicating with a freelance marketplace AI. Focus on making prompts more specific, detailed, and clear. Never mention that you're rewriting the prompt - just provide the improved version."
          }
        })
      });
      
      let improvedPrompt = '';
      
      if (result.content) {
        // Normal API response
        improvedPrompt = result.content;
      } else if (result.response) {
        // Legacy API response format
        improvedPrompt = result.response;
      }
      
      // Remove any quotes that might be in the response
      const cleanPrompt = improvedPrompt.replace(/^["']|["']$/g, '');
      setMessage(cleanPrompt);
    } catch (error: any) {
      console.error('Error improving prompt:', error);
    } finally {
      setIsImprovingPrompt(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-center">Direct AI Chat Test</h1>
        <p className="text-center mb-8 text-muted-foreground">Use this page to directly test the AI service connection</p>
        
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat">Test Chat</TabsTrigger>
            <TabsTrigger value="status">Service Status</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Direct AI Message Test</CardTitle>
                <CardDescription>
                  Send a message directly to the AI backend to test connectivity
                </CardDescription>
                <div className="mt-4 p-3 bg-muted/50 rounded-md text-sm">
                  <h4 className="font-medium mb-2">How to write effective freelancer prompts:</h4>
                  <ul className="space-y-1 list-disc pl-5">
                    <li>Be specific about the type of freelancer you need (designer, developer, writer, etc.)</li>
                    <li>Include skill requirements that are important for your project</li>
                    <li>Mention any timeline, budget constraints, or project details</li>
                    <li>Ask for specific freelancer qualities (communication style, work approach)</li>
                    <li>Use the "Make This Prompt Better" button to enhance your query</li>
                  </ul>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {!authToken && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangleIcon className="h-4 w-4" />
                    <AlertDescription>
                      You are not authenticated. Please login first to test the AI service.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div>
                  <Textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your message"
                    rows={4}
                    className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
                    style={{backgroundColor: 'var(--input)'}}
                  />
                  <div className="mt-2 text-xs text-muted-foreground">
                    <p>💡 Tip: Use specific details and clear requests to get better responses from the AI.</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={improvePrompt}
                    disabled={isImprovingPrompt || !message.trim() || !authToken}
                    variant="outline"
                    className="flex-1"
                  >
                    {isImprovingPrompt ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Improving...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Make This Prompt Better
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={sendDirectMessage}
                    disabled={isLoading || !authToken || !message.trim()}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Message'
                    )}
                  </Button>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-2">Response:</p>
                  <div className="relative min-h-[200px] rounded-md border p-4">
                    {response ? (
                      <p className="whitespace-pre-wrap">{response}</p>
                    ) : (
                      <p className="text-muted-foreground italic">Response will appear here...</p>
                    )}
                    
                    {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                        <div className="flex flex-col items-center">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <p className="mt-2">Getting response...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setMessage('')}>
                  Clear Input
                </Button>
                <Button variant="outline" onClick={() => setResponse('')}>
                  Clear Response
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="status" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>AI Service Status</CardTitle>
                <CardDescription>
                  Current status of the AI service and its components
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <Button 
                    onClick={checkAIServiceStatus}
                    variant="outline"
                    className="mb-4"
                  >
                    Refresh Status
                  </Button>
                  
                  {aiStatus && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className={`h-3 w-3 rounded-full ${aiStatus.available ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <p className="font-medium">AI Service: {aiStatus.available ? 'Available' : 'Unavailable'}</p>
                      </div>
                      
                      {aiStatus.services && (
                        <>
                          <div className="pl-5 space-y-2 border-l-2 border-muted">
                            <div className="flex items-center space-x-2">
                              <div className={`h-2 w-2 rounded-full ${aiStatus.services.deepseek ? 'bg-green-500' : 'bg-red-500'}`}></div>
                              <p>DeepSeek: {aiStatus.services.deepseek ? 'Available' : 'Unavailable'}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className={`h-2 w-2 rounded-full ${aiStatus.services.ollama ? 'bg-green-500' : 'bg-red-500'}`}></div>
                              <p>Ollama: {aiStatus.services.ollama ? 'Available' : 'Unavailable'}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className={`h-2 w-2 rounded-full ${aiStatus.services.original ? 'bg-green-500' : 'bg-red-500'}`}></div>
                              <p>Local Fallback: {aiStatus.services.original ? 'Available' : 'Unavailable'}</p>
                            </div>
                          </div>
                          
                          <div className="pt-2">
                            <p className="font-medium">Primary Service: {aiStatus.primaryService || 'None'}</p>
                          </div>
                        </>
                      )}
                      
                      <Alert>
                        <InfoIcon className="h-4 w-4" />
                        <AlertDescription>
                          {aiStatus.available 
                            ? `AI service is available using ${aiStatus.primaryService || 'unknown'} as the primary service.` 
                            : "AI service is currently unavailable. Check the API keys and server configuration."}
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                  
                  {!aiStatus && (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}