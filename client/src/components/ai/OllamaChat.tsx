import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { sendOllamaMessage, checkOllamaStatus } from '@/lib/ollama-service';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Loader2, Send, AlertCircle, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AIChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export function OllamaChat() {
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAIAvailable, setIsAIAvailable] = useState<boolean | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Check if Ollama service is available on mount
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const available = await checkOllamaStatus();
        setIsAIAvailable(available);
        
        if (!available) {
          setMessages([
            {
              id: generateId(),
              content: "Welcome to our freelance marketplace! I'm your AI assistant powered by Ollama, but I'm currently unavailable. Please start Ollama on your computer to use this feature.",
              isUser: false,
              timestamp: new Date(),
            },
          ]);
        } else {
          // Add welcome message
          setMessages([
            {
              id: generateId(),
              content: "Hi there! I'm FreelanceAI, your intelligent assistant powered by Ollama. How can I help you today? You can ask me to find freelancers for your project or help you understand how our marketplace works.",
              isUser: false,
              timestamp: new Date(),
            },
          ]);
        }
      } catch (error) {
        console.error('Error checking Ollama status:', error);
        setIsAIAvailable(false);
        toast({
          title: 'Ollama Unavailable',
          description: 'The Ollama service is currently unavailable. Please make sure Ollama is running on your computer.',
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
      // Send message to Ollama service
      const response = await sendOllamaMessage(userMessage.content);
      
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
      console.error('Error sending message to Ollama:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to get a response from Ollama',
        variant: 'destructive',
      });
      
      // Add error message to chat
      setMessages(prev => [
        ...prev,
        {
          id: generateId(),
          content: "I'm sorry, I encountered an error while processing your request. Please ensure Ollama is running correctly.",
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
        <p className="ml-2">Connecting to Ollama...</p>
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
          <h3 className="text-sm font-medium">FreelanceAI Assistant (Ollama)</h3>
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
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Messages area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {!isAIAvailable && (
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Ollama is not running.</strong> Please start Ollama on your computer to use this feature.
                Visit <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="text-primary underline">ollama.ai</a> to download and install.
              </AlertDescription>
            </Alert>
          )}
          
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
            placeholder={isAIAvailable ? "Ask me about finding freelancers..." : "Ollama is currently offline"}
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
            Ollama is not running. Please start Ollama on your computer to use this feature.
          </div>
        )}
      </div>
    </Card>
  );
}