import React, { useEffect, useState } from 'react';
import { useLocation, useParams, useRoute } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Send, User, Bot, Loader2 } from 'lucide-react';

export default function MessagesPage() {
  const params = useParams();
  const freelancerId = parseInt(params.id);
  const [, setLocation] = useLocation();
  const { currentUser, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [inputValue, setInputValue] = useState('');
  const [chatId, setChatId] = useState<number | null>(null);
  const [isSending, setIsSending] = useState(false);
  
  // Check if a chat already exists with this freelancer
  const { data: chatsData, isLoading: isLoadingChats } = useQuery({
    queryKey: ['/api/client/chats'],
    queryFn: async () => {
      // Import the token refresh function
      const { refreshAuthToken } = await import('@/lib/auth');
      
      // Try to refresh the token first
      const token = await refreshAuthToken();
      
      if (!token) {
        throw new Error('Authentication token not available');
      }
      
      const response = await fetch('/api/client/chats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }
      
      return await response.json();
    },
    enabled: isAuthenticated && !!freelancerId
  });
  
  // Find any existing chat with this freelancer
  useEffect(() => {
    if (chatsData?.chats && freelancerId) {
      console.log("Available chats:", chatsData.chats);
      const existingChat = chatsData.chats.find(
        (chat: any) => chat.freelancerId === freelancerId
      );
      
      if (existingChat) {
        console.log("Found current chat:", existingChat);
        setChatId(existingChat.id);
      }
    }
  }, [chatsData, freelancerId]);
  
  // Fetch chat messages if we have a chat ID
  const { data: messagesData, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['/api/client/chats', chatId, 'messages'],
    queryFn: async () => {
      if (!chatId) return { messages: [] };
      
      // Import the token refresh function
      const { refreshAuthToken } = await import('@/lib/auth');
      
      // Try to refresh the token first
      const token = await refreshAuthToken();
      
      if (!token) {
        throw new Error('Authentication token not available');
      }
      
      const response = await fetch(`/api/client/chats/${chatId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      return await response.json();
    },
    enabled: isAuthenticated && !!chatId,
    refetchInterval: 2500 // Poll every 2.5 seconds
  });
  
  // Get freelancer details
  const { data: freelancerData, isLoading: isLoadingFreelancer } = useQuery({
    queryKey: ['/api/freelancers', freelancerId],
    queryFn: async () => {
      const response = await fetch(`/api/freelancers/${freelancerId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch freelancer details');
      }
      
      return await response.json();
    },
    enabled: !!freelancerId
  });
  
  // Send message handler
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !isAuthenticated) return;
    
    setIsSending(true);
    
    try {
      // If no chat exists yet, create one
      if (!chatId) {
        // Initialize chat with freelancer
        const initResponse = await apiRequest('/api/chat/init', {
          method: 'POST',
          body: JSON.stringify({ freelancerId })
        });
        
        if (initResponse.chatId) {
          setChatId(initResponse.chatId);
        } else {
          throw new Error('Failed to initialize chat');
        }
        
        // Send the message using the new chat ID
        await apiRequest('/api/chat/direct-message', {
          method: 'POST',
          body: JSON.stringify({
            message: inputValue,
            chatId: initResponse.chatId
          })
        });
      } else {
        // Send message to existing chat
        await apiRequest('/api/chat/direct-message', {
          method: 'POST',
          body: JSON.stringify({
            message: inputValue,
            chatId
          })
        });
      }
      
      // Clear input and invalidate queries to refresh data
      setInputValue('');
      queryClient.invalidateQueries({ queryKey: ['/api/client/chats', chatId, 'messages'] });
      
      // If this was a new chat, also invalidate the chats list
      if (!chatId) {
        queryClient.invalidateQueries({ queryKey: ['/api/client/chats'] });
      }
      
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  if (isLoadingChats || isLoadingFreelancer) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/client-messages')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Skeleton className="h-10 w-40 ml-2" />
        </div>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const freelancer = freelancerData?.freelancer;
  const messages = messagesData?.messages || [];
  const isInitializing = !chatId && messages.length === 0;
  
  // Generate avatar initials
  const freelancerName = freelancer?.displayName || 'Freelancer';
  const initials = freelancerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
  
  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/client-messages')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold ml-2">
          Conversation with {freelancer?.displayName || `Freelancer ${freelancerId}`}
        </h1>
      </div>
      
      <Card className="bg-white">
        <CardContent className="p-0">
          <div className="p-4 border-b flex items-center space-x-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={freelancer?.imageUrl || undefined} alt={freelancerName} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-medium">{freelancerName}</h2>
              <p className="text-sm text-muted-foreground">{freelancer?.profession}</p>
            </div>
          </div>
          
          <ScrollArea className="h-[500px] p-4">
            <div className="space-y-4">
              {isInitializing && (
                <div className="text-center text-muted-foreground py-6">
                  <p>Start a conversation with this freelancer</p>
                </div>
              )}
              
              {messages.map((message: any) => (
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
                          <AvatarImage src={currentUser?.photoURL || undefined} />
                          <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                        </>
                      ) : (
                        <>
                          <AvatarImage src={freelancer?.imageUrl || undefined} />
                          <AvatarFallback>{initials}</AvatarFallback>
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <Input
                placeholder="Type your message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSending}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} disabled={isSending || !inputValue.trim()}>
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="ml-2">Send</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}