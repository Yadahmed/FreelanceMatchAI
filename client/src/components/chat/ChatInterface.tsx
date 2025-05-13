import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, User, Bot } from 'lucide-react';
import { FreelancerCard } from '@/components/freelancer/FreelancerCard';

// Types for chat messages
interface Message {
  id: string;
  content: string;
  isUserMessage: boolean;
  timestamp: Date;
  freelancerResults?: any[];
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      content: 'Hello! I\'m your FreelanceMatchAI assistant. Tell me what type of freelancer you\'re looking for, and I\'ll help match you with the best candidates for your project.',
      isUserMessage: false,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [chatId, setChatId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated, currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus on input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    // Check if user is authenticated
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to use the chat feature.',
        variant: 'destructive',
      });
      return;
    }
    
    // Generate a temporary ID for the message
    const tempId = Date.now().toString();
    
    // Add user message to chat
    const userMessage: Message = {
      id: tempId,
      content: inputValue,
      isUserMessage: true,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      // Send message to server
      const payload = {
        message: inputValue,
        chatId: chatId,
      };
      
      const response = await apiRequest('/api/chat/message', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      // Update chat ID if it's a new chat
      if (!chatId && response.chatId) {
        setChatId(response.chatId);
      }
      
      // Add bot response to chat
      const botMessage: Message = {
        id: response.id || (Date.now() + 1).toString(),
        content: response.content || "I'm processing your request...",
        isUserMessage: false,
        timestamp: new Date(response.timestamp || Date.now()),
        freelancerResults: response.freelancerResults || [],
      };
      
      setMessages((prev) => [...prev, botMessage]);
      
      // Invalidate queries if needed
      if (response.freelancerResults) {
        queryClient.invalidateQueries({ queryKey: ['/api/freelancers'] });
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Add error message to chat
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: 'Sorry, there was an error processing your request. Please try again later.',
        isUserMessage: false,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorMessage]);
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Card className="flex-1 border rounded-lg overflow-hidden flex flex-col">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUserMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex gap-3 max-w-[80%] ${
                    message.isUserMessage ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    {message.isUserMessage ? (
                      <>
                        <AvatarImage 
                          src={currentUser?.photoURL || undefined} 
                          alt={currentUser?.displayName || currentUser?.username || 'User'} 
                        />
                        <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                      </>
                    ) : (
                      <>
                        <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  <div>
                    <div
                      className={`rounded-lg p-3 ${
                        message.isUserMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                    
                    {/* Render freelancer results if available */}
                    {!message.isUserMessage && message.freelancerResults && message.freelancerResults.length > 0 && (
                      <div className="mt-4 space-y-4">
                        <h3 className="text-sm font-medium">Top Freelancers For Your Request:</h3>
                        <div className="grid gap-4">
                          {message.freelancerResults.map((result) => {
                            // Check if the result has a nested freelancer object (AI service format)
                            if (result.freelancer) {
                              return <FreelancerCard key={result.freelancerId} freelancer={result.freelancer} />;
                            } 
                            // Fallback to treating the result itself as a freelancer (old format)
                            else if (result.id) {
                              return <FreelancerCard key={result.id} freelancer={result} />;
                            }
                            // Skip rendering if neither format is available
                            return null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}