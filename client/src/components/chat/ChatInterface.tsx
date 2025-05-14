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
import { Loader2, Send, User, Bot, MessageSquare } from 'lucide-react';
import { Link } from 'wouter';
import { FreelancerCard } from '@/components/freelancer/FreelancerCard';
import { FreelancerMention } from './FreelancerMention';

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
      content: 'Hello! I\'m your KurdJobs AI assistant. Tell me what type of freelancer you\'re looking for, and I\'ll help match you with the best candidates for your project.',
      isUserMessage: false,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [chatId, setChatId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestedPrompts] = useState<string[]>([
    "I need a web developer with React experience",
    "Looking for a logo designer for my startup",
    "Need a translator who speaks Kurdish and English",
    "Need a writer for my technical blog"
  ]);
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
    
    // Add typing indicator with a slight delay to improve user experience
    setTimeout(() => {
      setIsTyping(true);
    }, 300);
    
    try {
      // Decide which endpoint to use based on whether a chat was started
      let response;
      if (chatId) {
        // Using existing chat
        const payload = {
          message: inputValue,
          chatId: chatId,
        };
        
        response = await apiRequest('/api/chat/message', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } else {
        // Using AI endpoint for first message - this uses different params format
        // Use axios directly to handle different parameter format
        const axios = require('axios');
        const aiResponse = await axios.post('/api/ai/message', { 
          message: inputValue 
        });
        response = aiResponse.data;
        
        // Log the response to debug
        console.log("AI API response:", response);
      }
      
      // Update chat ID if it's a new chat and we have a chatId in response
      if (!chatId && response.chatId) {
        setChatId(response.chatId);
      }
      
      // Check if there are freelancer results and log them for debugging
      if (response.freelancerResults && response.freelancerResults.length > 0) {
        console.log("[Debug] Response contains freelancer results:", response.freelancerResults);
        // Inspect one result to see what props it has
        const sampleResult = response.freelancerResults[0];
        console.log("[Debug] Sample freelancer result keys:", Object.keys(sampleResult));
        
        if (sampleResult.freelancer) {
          console.log("[Debug] Sample nested freelancer keys:", Object.keys(sampleResult.freelancer));
        }
      } else {
        console.log("[Debug] No freelancer results in response");
      }
      
      // Remove typing indicator before showing the actual message
      setIsTyping(false);
      
      // Add a small delay before showing the response for a more natural feel
      setTimeout(() => {
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
      }, 500);
      
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Remove typing indicator before showing error
      setIsTyping(false);
      
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
      <Card className="flex-1 border rounded-lg overflow-hidden flex flex-col shadow-md dark:shadow-primary/5 bg-card">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUserMessage ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
              >
                <div
                  className={`flex gap-3 max-w-[85%] ${
                    message.isUserMessage ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <Avatar className={`h-10 w-10 border-2 shadow-sm mt-1 ${
                    message.isUserMessage 
                      ? 'border-primary/20 bg-primary/5' 
                      : 'border-secondary/20 bg-secondary/5'
                  }`}>
                    {message.isUserMessage ? (
                      <>
                        <AvatarImage 
                          src={currentUser?.photoURL || undefined} 
                          alt={currentUser?.displayName || currentUser?.username || 'User'} 
                        />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </>
                    ) : (
                      <>
                        <AvatarImage src="/ai-avatar.png" alt="KurdJobs AI" />
                        <AvatarFallback className="bg-secondary/10 text-secondary">
                          <Bot className="h-5 w-5" />
                        </AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  <div className="space-y-1">
                    <div className={`text-xs font-medium ${message.isUserMessage ? 'text-right mr-2' : 'ml-1'}`}>
                      {message.isUserMessage
                        ? (currentUser?.displayName || currentUser?.username || 'You')
                        : 'KurdJobs AI'}
                    </div>
                    <div
                      className={`rounded-xl p-4 shadow-sm ${
                        message.isUserMessage
                          ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-none'
                          : 'bg-muted/80 dark:bg-muted/40 rounded-tl-none'
                      }`}
                    >
                      {message.isUserMessage ? (
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      ) : (
                        <div className="text-sm leading-relaxed">
                          <FreelancerMention content={message.content} />
                        </div>
                      )}
                    </div>
                    <p className={`text-xs text-muted-foreground ${message.isUserMessage ? 'text-right mr-2' : 'ml-1'}`}>
                      {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                    
                    {/* Render freelancer results if available */}
                    {!message.isUserMessage && message.freelancerResults && message.freelancerResults.length > 0 && (
                      <div className="mt-5 space-y-5 animate-fade-in">
                        {/* Add a prominent "Chat with All Freelancers" button at the top */}
                        <div className="bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 p-4 rounded-xl border border-primary/10 shadow-sm">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div>
                              <h4 className="font-semibold text-primary dark:text-primary/90">Expert Freelancers Found!</h4>
                              <p className="text-sm text-muted-foreground mt-1">Connect directly with our top matches</p>
                            </div>
                            <Button 
                              size="default" 
                              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary 
                                         shadow-md hover:shadow-lg transition-all duration-300 items-center gap-2 w-full sm:w-auto"
                              asChild
                            >
                              <Link href="/messages">
                                <MessageSquare className="h-4 w-4" />
                                Chat with All Matched Freelancers
                              </Link>
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <h3 className="text-sm font-semibold">Top Freelancers For Your Request:</h3>
                          
                          {/* Quick action buttons for top freelancers */}
                          <div className="flex flex-wrap gap-2">
                            {message.freelancerResults.slice(0, 3).map((result) => {
                              // Get the freelancer ID from either format
                              const freelancerId = result.freelancerId || result.id || 
                                (result.freelancer && result.freelancer.id);
                              
                              if (!freelancerId) return null;

                              // Get the freelancer name from either format
                              const freelancer = result.freelancer || result;
                              const name = freelancer.displayName || 
                                (freelancer.username ? freelancer.username : `Freelancer ${freelancerId}`);
                              
                              const shortName = name.split(' ')[0];
                              
                              // Create the chat buttons for the top 3 freelancers
                              return (
                                <Button 
                                  key={`chat-quick-${freelancerId}`}
                                  size="sm" 
                                  variant="outline" 
                                  className="bg-background hover:bg-primary/5 hover:text-primary border-primary/20
                                             shadow-sm hover:shadow transition-all duration-300 items-center gap-1 rounded-full px-3 py-1"
                                  asChild
                                >
                                  <Link href={`/messages/new/${freelancerId}`}>
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    Chat with {shortName}
                                  </Link>
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                        
                        <div className="grid gap-4">
                          {message.freelancerResults.map((result) => {
                            // Check if the result has a nested freelancer object (AI service format)
                            if (result.freelancer) {
                              console.log("Rendering freelancer from nested object:", result.freelancer);
                              return <FreelancerCard key={result.freelancerId} freelancer={result.freelancer} />;
                            } 
                            // Fallback to treating the result itself as a freelancer (old format)
                            else if (result.id) {
                              console.log("Rendering freelancer directly:", result);
                              return <FreelancerCard key={result.id} freelancer={result} />;
                            }
                            // Log the result format if it doesn't match expected formats
                            console.log("Skipping freelancer result due to unexpected format:", result);
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
            
            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start animate-fade-in-up">
                <div className="flex gap-3">
                  <Avatar className="h-10 w-10 border-2 border-secondary/20 bg-secondary/5 shadow-sm mt-1">
                    <AvatarFallback className="bg-secondary/10 text-secondary">
                      <Bot className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <div className="text-xs font-medium ml-1">KurdJobs AI</div>
                    <div className="bg-muted/80 dark:bg-muted/40 rounded-xl rounded-tl-none p-4 shadow-sm">
                      <div className="flex space-x-1 items-center h-5">
                        <div className="w-2 h-2 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: '600ms' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-card/80 backdrop-blur-sm">
          {/* Suggested prompts */}
          {messages.length <= 2 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Suggested questions:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt, index) => (
                  <Button 
                    key={index} 
                    variant="outline" 
                    size="sm" 
                    className="text-xs py-1 px-3 h-auto bg-background hover:bg-primary/5 hover:text-primary border-primary/10
                              transition-colors duration-300"
                    onClick={() => setInputValue(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="flex-1 border-primary/20 focus-visible:ring-primary/30 py-6 bg-background"
              disabled={isLoading || isTyping}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!inputValue.trim() || isLoading || isTyping}
              className="bg-primary hover:bg-primary/90 shadow-md transition-all duration-300"
            >
              {isLoading ? 
                <Loader2 className="h-4 w-4 animate-spin" /> : 
                <Send className="h-4 w-4" />
              }
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}