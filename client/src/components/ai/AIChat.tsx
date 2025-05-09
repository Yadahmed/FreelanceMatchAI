import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { sendAIMessage, checkAIStatus } from '@/lib/ai-service';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Loader2, Send, AlertCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

// Interface for AI status response
interface AIStatusResponse {
  available: boolean;
  services?: {
    deepseek: boolean;
    ollama: boolean;
    original: boolean;
  };
  primaryService?: 'deepseek' | 'ollama' | null;
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
  const [isAIAvailable, setIsAIAvailable] = useState<boolean | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // State for tracking which AI service is being used
  const [activeService, setActiveService] = useState<'deepseek' | 'ollama' | null>(null);
  
  // Check if AI service is available on mount
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        // Get detailed status information
        const statusResponse = await checkAIStatus(true) as AIStatusResponse;
        const available = statusResponse.available;
        setIsAIAvailable(available);
        
        // Set the active service
        setActiveService(statusResponse.primaryService || null);
        
        if (!available) {
          // Check which specific services are unavailable
          const services = statusResponse.services || { deepseek: false, ollama: false, original: false };
          
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
        const newService = response.metadata.provider as 'deepseek' | 'ollama';
        
        if (newService !== activeService) {
          setActiveService(newService);
          
          // If we've switched to Ollama as fallback, show an informative message
          if (newService === 'ollama' && activeService === 'deepseek') {
            setMessages(prev => [
              ...prev, 
              {
                id: generateId(),
                content: "Note: I'm now using Ollama as a fallback service because DeepSeek is currently unavailable. I'll continue to assist you with the best available service.",
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
            {activeService === 'deepseek' && " (DeepSeek R1)"}
            {activeService === 'ollama' && " (Ollama)"}
          </h3>
          <div className="flex items-center">
            {isAIAvailable ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                <span className="text-xs text-muted-foreground">Online</span>
                {activeService && (
                  <span className={`text-xs text-muted-foreground ml-2 ${
                    activeService === 'deepseek' ? 'bg-green-50' : 'bg-amber-50'
                  } px-1 rounded`}>
                    {activeService === 'deepseek' ? 'DeepSeek API' : 'Ollama Fallback'}
                  </span>
                )}
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
            disabled={!isAIAvailable || isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!isAIAvailable || isLoading || !inputValue.trim()}
            variant="default"
            size="icon"
            className="h-auto"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        
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