import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { sendAIMessage, checkAIStatus } from '@/lib/ai-service';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Loader2, Send, AlertCircle, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiRequest } from '@/lib/queryClient';

// Interface for AI status response
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

interface AIChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export function AIChat() {
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);
  const [isAIAvailable, setIsAIAvailable] = useState<boolean | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // State for tracking which AI service is being used
  const [activeService, setActiveService] = useState<'deepseek' | 'anthropic' | 'ollama' | null>(null);
  
  // Check if AI service is available on mount
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        console.log("Checking AI availability from AIChat component...");
        // Get detailed status information
        const statusResponse = await checkAIStatus(true) as AIStatusResponse;
        console.log("AI status response in AIChat:", statusResponse);
        
        const available = statusResponse.available;
        
        // Force availability if any services are available
        const services = statusResponse.services || { deepseek: false, anthropic: false, ollama: false, original: false };
        const forceAvailable = services.deepseek || services.anthropic || services.ollama;
        
        setIsAIAvailable(available || forceAvailable);
        
        // Set the active service - prefer deepseek, then anthropic, then fallback to ollama
        if (statusResponse.services?.deepseek) {
          setActiveService('deepseek');
        } else if (statusResponse.services?.anthropic) {
          setActiveService('anthropic');
        } else if (statusResponse.services?.ollama) {
          setActiveService('ollama');
        } else {
          setActiveService(statusResponse.primaryService || null);
        }
        
        if (!available) {
          // Check which specific services are unavailable
          const services = statusResponse.services || { deepseek: false, anthropic: false, ollama: false, original: false };
          console.log("AI services status:", services);
          
          // Fix for the case where services might be available but not recognized
          const isAnyServiceActuallyAvailable = services.deepseek || services.anthropic || services.ollama;
          if (isAnyServiceActuallyAvailable && !available) {
            console.log("Services available but status reports unavailable, correcting...");
            setIsAIAvailable(true);
            setActiveService(services.deepseek ? 'deepseek' : 'ollama');
            
            // Add welcome message
            let welcomeMessage = "Hi there! I'm FreelanceAI, your intelligent assistant";
            if (services.deepseek) {
              welcomeMessage += " powered by DeepSeek R1 API.";
            } else if (services.anthropic) {
              welcomeMessage += " powered by Anthropic Claude.";
            } else if (services.ollama) {
              welcomeMessage += " (using Ollama as a fallback service).";
            } else {
              welcomeMessage += ".";
            }
            
            welcomeMessage += " How can I help you today? You can ask me to find freelancers for your project or help you understand how our marketplace works.";
            
            setMessages([
              {
                id: generateId(),
                content: welcomeMessage,
                isUser: false,
                timestamp: new Date(),
              },
            ]);
            
            return;
          }
          
          let unavailableMessage = "Welcome to our freelance marketplace! I'm your AI assistant, but I'm currently unavailable. ";
          
          // Provide more specific information based on which service is unavailable
          if (!services.deepseek && !services.ollama) {
            unavailableMessage += "All AI services are offline. Our team is working on it and I'll be back soon!";
          } else if (!services.deepseek && services.ollama) {
            unavailableMessage += "The DeepSeek R1 API service is unavailable, but Ollama might work as a fallback.";
          } else {
            unavailableMessage += "Our team is working on it and I'll be back soon!";
          }
          
          setMessages([
            {
              id: generateId(),
              content: unavailableMessage,
              isUser: false,
              timestamp: new Date(),
            },
          ]);
        } else {
          // Generate a welcome message based on which service is being used
          let welcomeMessage = "Hi there! I'm FreelanceAI, your intelligent assistant";
          
          if (activeService === 'deepseek') {
            welcomeMessage += " powered by DeepSeek R1 API.";
          } else if (activeService === 'anthropic') {
            welcomeMessage += " powered by Anthropic Claude.";
          } else if (activeService === 'ollama') {
            welcomeMessage += " (using Ollama as a fallback service).";
          } else {
            welcomeMessage += ".";
          }
          
          welcomeMessage += " How can I help you today? You can ask me to find freelancers for your project or help you understand how our marketplace works.";
          
          setMessages([
            {
              id: generateId(),
              content: welcomeMessage,
              isUser: false,
              timestamp: new Date(),
            },
          ]);
        }
      } catch (error) {
        console.error('Error checking AI status:', error);
        setIsAIAvailable(false);
        setActiveService(null);
        toast({
          title: 'AI Assistant Unavailable',
          description: 'The AI service is currently unavailable. Please try again later.',
          variant: 'destructive',
        });
      }
    };
    
    checkAvailability();
  }, [toast]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !isAIAvailable) return;
    
    // Add user message to chat
    const userMessage: AIChatMessage = {
      id: generateId(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      // Send message to AI service
      const response = await sendAIMessage(userMessage.content);
      
      // Check if the response metadata indicates a change in provider
      if (response.metadata?.provider) {
        // Update the active service based on the provider used for this response
        const newService = response.metadata.provider as 'deepseek' | 'anthropic' | 'ollama';
        
        if (newService !== activeService) {
          setActiveService(newService);
          
          // Show informative message based on fallback
          if (newService === 'anthropic' && activeService === 'deepseek') {
            setMessages(prev => [
              ...prev, 
              {
                id: generateId(),
                content: "Note: I'm now using Anthropic Claude as a fallback service because DeepSeek R1 is currently unavailable. I'll continue to assist you with the best available service.",
                isUser: false,
                timestamp: new Date(),
              }
            ]);
          } else if (newService === 'ollama' && (activeService === 'deepseek' || activeService === 'anthropic')) {
            setMessages(prev => [
              ...prev, 
              {
                id: generateId(),
                content: "Note: I'm now using Ollama as a fallback service because other AI services are currently unavailable. I'll continue to assist you with the best available service.",
                isUser: false,
                timestamp: new Date(),
              }
            ]);
          }
        }
      }
      
      // Add AI response to chat
      const aiMessage: AIChatMessage = {
        id: generateId(),
        content: response.content,
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Invalidate freelancer query cache if the message might have triggered a search
      if (
        userMessage.content.toLowerCase().includes('find freelancer') ||
        userMessage.content.toLowerCase().includes('looking for') ||
        userMessage.content.toLowerCase().includes('need someone to')
      ) {
        queryClient.invalidateQueries({ queryKey: ['/api/freelancers'] });
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to get a response from the AI assistant',
        variant: 'destructive',
      });
      
      // Add error message to chat
      setMessages(prev => [
        ...prev,
        {
          id: generateId(),
          content: "I'm sorry, I encountered an error while processing your request. Please try again later.",
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  /**
   * Improve the current prompt using AI assistance
   * This helps users craft better prompts to get more relevant freelancer-related responses
   */
  const improvePrompt = async () => {
    if (!inputValue.trim() || !isAIAvailable || isImprovingPrompt) return;
    
    setIsImprovingPrompt(true);
    
    try {
      // Ask the AI to improve the prompt for better results
      const result = await apiRequest('/api/ai/message', {
        method: 'POST',
        body: JSON.stringify({ 
          message: `Please rewrite the following prompt to be more effective for our freelance marketplace AI assistant. Make it specific, detailed, and clear: "${inputValue}"`,
          metadata: { 
            direct: true,
            model: "claude-3-7-sonnet-20250219",
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
      setInputValue(cleanPrompt);
      
      // Show a toast notification that the prompt was improved
      toast({
        title: "Prompt Improved",
        description: "Your prompt has been enhanced for better results.",
      });
      
    } catch (error: any) {
      console.error('Error improving prompt:', error);
      toast({
        title: 'Error',
        description: "Couldn't improve your prompt. Please try again.",
        variant: 'destructive',
      });
    } finally {
      setIsImprovingPrompt(false);
    }
  };
  
  if (isAIAvailable === null) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Connecting to AI assistant...</p>
      </div>
    );
  }
  
  return (
    <Card className="flex flex-col h-[500px] md:h-[600px] overflow-hidden">
      {/* Status bar */}
      <div className="bg-primary/10 p-2 flex items-center">
        <Avatar className="h-8 w-8 mr-2 bg-primary">
          <span className="text-xs font-bold">AI</span>
        </Avatar>
        <div className="flex-1">
          <h3 className="text-sm font-medium">
            FreelanceAI Assistant
          </h3>
          <div className="flex items-center">
            {isAIAvailable ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                <span className="text-xs text-muted-foreground">Online</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                <span className="text-xs text-muted-foreground">Offline</span>
                <span className="text-xs text-muted-foreground ml-2 bg-red-50 px-1 rounded">
                  All Services Unavailable
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Messages area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.isUser
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Input area */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Textarea
            placeholder={isAIAvailable ? "Ask me about finding freelancers..." : "AI Assistant is currently offline"}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[60px] resize-none"
            disabled={!isAIAvailable || isLoading || isImprovingPrompt}
          />
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleSendMessage}
              disabled={!isAIAvailable || isLoading || isImprovingPrompt || !inputValue.trim()}
              variant="default"
              size="icon"
              className="h-[30px]"
              title="Send message"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
            
            <Button
              onClick={improvePrompt}
              disabled={!isAIAvailable || isLoading || isImprovingPrompt || !inputValue.trim()}
              variant="outline"
              size="icon"
              className="h-[30px]"
              title="Make this prompt better"
            >
              {isImprovingPrompt ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Prompt helper text */}
        {inputValue.trim() && inputValue.length < 20 && isAIAvailable && (
          <div className="mt-2 text-xs text-muted-foreground p-2 bg-primary/5 rounded border border-primary/10">
            <p><strong>Tip:</strong> More specific prompts get better results. Try adding details like:</p>
            <ul className="list-disc list-inside ml-2 mt-1">
              <li>Type of freelancer you need (developer, designer, writer)</li>
              <li>Required skills and experience level</li>
              <li>Budget range and timeline</li>
              <li>Project details and deliverables</li>
            </ul>
            <p className="mt-1">Or use the ✨ button to automatically improve your prompt!</p>
          </div>
        )}
        
        {/* Service status message */}
        {!isAIAvailable && (
          <div className="flex items-center justify-center mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
            <AlertCircle className="h-4 w-4 mr-1" />
            The AI service is currently unavailable. Our team is working on it.
          </div>
        )}
      </div>
    </Card>
  );
}