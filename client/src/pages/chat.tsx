import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Send, User, Loader2, Trash2, MoreVertical } from 'lucide-react';
import { ChatParticipantDisplay, getParticipantInitials } from '@/components/chat/ChatParticipantDisplay';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const chatId = params?.id ? parseInt(params.id, 10) : null;
  const [, setLocation] = useLocation();
  const { currentUser, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  
  // Get search parameters to check if we're trying to initiate a chat with a freelancer
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const targetFreelancerId = searchParams.get('freelancer');
  
  // Check if current user is a freelancer trying to message another freelancer
  const isFreelancerMessagingFreelancer = !currentUser?.isClient && targetFreelancerId;
  
  // Fetch chat basic information
  const {
    data: chatInfo,
    isLoading: isLoadingChatInfo
  } = useQuery({
    queryKey: [`/api/${currentUser?.isClient ? 'client' : 'freelancer'}/chats`],
    queryFn: async () => {
      // Import the token refresh function
      const { refreshAuthToken } = await import('@/lib/auth');
      
      // Try to refresh the token first
      const token = await refreshAuthToken();
      
      if (!token) {
        throw new Error('Authentication token not available');
      }
      
      const response = await fetch(`/api/${currentUser?.isClient ? 'client' : 'freelancer'}/chats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }
      
      const data = await response.json();
      console.log('Available chats:', data.chats);
      
      // Find the current chat in the chats list
      const currentChat = data.chats.find((chat: any) => chat.id === chatId);
      console.log('Found current chat:', currentChat);
      
      if (currentChat && !currentChat.freelancerId && currentUser?.isClient) {
        console.error('Warning: Chat found but missing freelancerId property:', currentChat);
      }
      
      return currentChat;
    },
    enabled: !!chatId && !!currentUser && !!isAuthenticated,
    refetchInterval: 5000 // Refresh chat info every 5 seconds
  });

  // We'll use a separate component for displaying participant names

  // Fetch chat messages
  const { 
    data: chatData, 
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [`/api/${currentUser?.isClient ? 'client' : 'freelancer'}/chats/${chatId}/messages`],
    queryFn: async () => {
      if (!chatId) throw new Error('Chat ID is required');
      
      // Import the token refresh function
      const { refreshAuthToken } = await import('@/lib/auth');
      
      // Try to refresh the token first
      const token = await refreshAuthToken();
      
      if (!token) {
        throw new Error('Authentication token not available');
      }
      
      const response = await fetch(`/api/${currentUser?.isClient ? 'client' : 'freelancer'}/chats/${chatId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch chat messages');
      }
      
      return await response.json();
    },
    enabled: !!chatId && !!currentUser && !!isAuthenticated,
    refetchInterval: 2500, // Auto-refresh messages every 2.5 seconds
    refetchIntervalInBackground: true // Refresh even when tab is in background
  });
  
  // Check if freelancer is trying to message another freelancer 
  // and redirect them if that's the case
  useEffect(() => {
    if (isFreelancerMessagingFreelancer) {
      toast({
        title: "Access Restricted",
        description: "Freelancers cannot message other freelancers. Only clients can initiate conversations with freelancers.",
        variant: "destructive"
      });
      setLocation('/');
    }
  }, [isFreelancerMessagingFreelancer, toast, setLocation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatData]);
  
  // Handle going back
  const handleBack = () => {
    if (currentUser?.isClient) {
      setLocation('/client-dashboard');
    } else {
      setLocation('/');
    }
  };
  
  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      // The logic differs based on whether the user is a client or a freelancer
      if (currentUser?.isClient && !chatInfo?.freelancerId) {
        throw new Error('Freelancer ID not found. Try refreshing the page.');
      }
      
      // Import the token refresh function
      const { refreshAuthToken } = await import('@/lib/auth');
      
      // Try to refresh the token first
      const token = await refreshAuthToken();
      
      if (!token) {
        throw new Error('Authentication token not available');
      }
      
      // We've simplified the API - we just need the chatId now
      // The server will determine user role and validate permissions
      const messageData = {
        message: messageText,
        chatId: chatId
      };
      
      console.log('Sending message with data:', messageData);
      
      const endpoint = '/api/chat/direct-message';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(messageData)
      });
      
      if (!response.ok) {
        // Special handling for auth errors
        if (response.status === 401) {
          throw new Error('Your session has expired. Please sign in again.');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Refetch chat messages after successful send
      refetch();
      queryClient.invalidateQueries({ 
        queryKey: [`/api/${currentUser?.isClient ? 'client' : 'freelancer'}/chats`] 
      });
    }
  });
  
  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      if (!chatId) {
        throw new Error('Chat ID is required');
      }
      
      // Import the token refresh function
      const { refreshAuthToken } = await import('@/lib/auth');
      
      // Try to refresh the token first
      const token = await refreshAuthToken();
      
      if (!token) {
        throw new Error('Authentication token not available');
      }
      
      const endpoint = `/api/${currentUser?.isClient ? 'client' : 'freelancer'}/chats/${chatId}/messages/${messageId}`;
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        // Special handling for auth errors
        if (response.status === 401) {
          throw new Error('Your session has expired. Please sign in again.');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete message');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Refetch chat messages after successful deletion
      refetch();
      queryClient.invalidateQueries({ 
        queryKey: [`/api/${currentUser?.isClient ? 'client' : 'freelancer'}/chats`] 
      });
      
      // Reset state
      setMessageToDelete(null);
      setIsDeleteDialogOpen(false);
      
      // Show success toast
      toast({
        title: "Message deleted",
        description: "The message was deleted successfully",
      });
    },
    onError: (error: any) => {
      // Reset state
      setMessageToDelete(null);
      setIsDeleteDialogOpen(false);
      
      // Show error toast
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete message',
        variant: 'destructive'
      });
    }
  });
  
  // Handle message deletion
  const handleDeleteMessage = (messageId: number) => {
    setMessageToDelete(messageId);
    setIsDeleteDialogOpen(true);
  };
  
  // Confirm message deletion
  const confirmDeleteMessage = () => {
    if (messageToDelete) {
      deleteMessageMutation.mutate(messageToDelete);
    }
  };
  
  const handleSendMessage = async () => {
    if (!message.trim() || isSending) return;
    
    // Log user role information to help with debugging
    console.log('User role:', currentUser?.isClient ? 'Client' : 'Freelancer');
    console.log('Chat ID:', chatId);
    
    if (currentUser?.isClient && !chatInfo?.freelancerId) {
      console.error('Missing freelancerId in chatInfo for client:', chatInfo);
      toast({
        title: "Cannot send message",
        description: "Freelancer information not available. Please refresh the page.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSending(true);
    try {
      await sendMessageMutation.mutateAsync(message);
      setMessage('');
      
      // Explicitly refetch messages to update UI immediately
      refetch();
      
      toast({
        title: "Message sent",
        description: "Your message was sent successfully",
      });
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive'
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
  
  // Protect against unauthorized access or missing chat ID
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center p-8">
            <h2 className="text-xl font-medium text-red-600 mb-2">Authentication Required</h2>
            <p className="text-muted-foreground">Please sign in to view this chat.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setLocation('/')}
            >
              Go to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!chatId) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center p-8">
            <h2 className="text-xl font-medium text-red-600 mb-2">Invalid Chat ID</h2>
            <p className="text-muted-foreground">The chat you are trying to view does not exist or is invalid.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={handleBack}
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Skeleton className="h-6 w-40" />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-3/4 ml-auto" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-3/4 ml-auto" />
              </div>
            </CardContent>
            <CardFooter>
              <div className="flex w-full gap-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-10" />
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center p-8 bg-red-50 rounded-lg">
            <h2 className="text-xl font-medium text-red-600 mb-2">Error Loading Chat</h2>
            <p className="text-red-600">We couldn't load this chat. Please try again later.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={handleBack}
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  const messages = chatData?.messages || [];
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="flex flex-col h-[80vh]">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {currentUser?.isClient 
                      ? (chatData?.freelancer?.displayName?.substring(0, 2) || 'FR') 
                      : (chatData?.client?.displayName?.substring(0, 2) || 
                         chatData?.client?.username?.substring(0, 2) || 
                         `C${chatData?.userId?.toString().substring(0, 1) || '?'}`)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">
                    <ChatParticipantDisplay chatData={chatData} />
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {messages.length} messages
                  </CardDescription>
                </div>
              </div>
              <div className="w-20"></div> {/* Spacer for balance */}
            </div>
          </CardHeader>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg: any) => {
                const isCurrentUser = (currentUser?.isClient && msg.isUserMessage) ||
                                     (!currentUser?.isClient && !msg.isUserMessage);
                                     
                return (
                  <div 
                    key={msg.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`flex gap-3 max-w-[80%] ${
                        isCurrentUser ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {isCurrentUser 
                            ? (currentUser?.displayName?.substring(0, 2) || 'ME') 
                            : (currentUser?.isClient 
                                ? (chatData?.freelancer?.displayName?.substring(0, 2) || 'FR')
                                : (chatData?.client?.displayName?.substring(0, 2) || 
                                   chatData?.client?.username?.substring(0, 2) || 
                                   `C${chatData?.userId?.toString().substring(0, 1) || '?'}`))}
                        </AvatarFallback>
                      </Avatar>
                      <div className="relative group">
                        <div
                          className={`rounded-lg p-3 ${
                            isCurrentUser
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                        
                        {/* Only show message options for freelancer's own messages */}
                        {!currentUser?.isClient && isCurrentUser && (
                          <div className="absolute top-0 right-0 -mt-2 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 rounded-full hover:bg-muted"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">More options</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive flex items-center cursor-pointer"
                                  onClick={() => handleDeleteMessage(msg.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete message
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          <CardFooter className="p-4 border-t">
            <div className="flex w-full gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="flex-1 dark:bg-slate-800 dark:text-white dark:border-slate-700"
                disabled={isSending}
                style={{backgroundColor: 'var(--input)'}}
              />
              <Button onClick={handleSendMessage} disabled={!message.trim() || isSending}>
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </CardFooter>
        </Card>
        
        {/* Message deletion confirmation dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Message</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this message? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setMessageToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteMessage}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMessageMutation.isPending ? (
                  <>
                    <span className="mr-2">Deleting...</span>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}