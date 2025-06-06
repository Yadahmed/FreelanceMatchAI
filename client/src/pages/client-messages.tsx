import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, User, Calendar, ArrowLeft, Trash2, MoreVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
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

export default function ClientMessagesPage() {
  const [, setLocation] = useLocation();
  const { currentUser, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for delete confirmation dialog
  const [chatToDelete, setChatToDelete] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Fetch client chats
  const { data, isLoading, error, refetch } = useQuery({
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
        },
        // Force skip cache with a unique parameter
        cache: 'no-store'
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Your session has expired. Please sign in again.');
        }
        throw new Error('Failed to fetch chats');
      }
      
      const responseData = await response.json();
      console.log('CLIENT MESSAGES - Chat data received:', responseData);
      
      // Debug information about what we're receiving
      if (responseData.chats && responseData.chats.length > 0) {
        console.log('First chat freelancer data:', responseData.chats[0].freelancer);
      }
      
      return responseData;
    },
    enabled: !!isAuthenticated && currentUser?.isClient === true,
    refetchOnWindowFocus: true // Refresh when user returns to this page
  });
  
  // Delete chat mutation
  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: number) => {
      // Import the token refresh function
      const { refreshAuthToken } = await import('@/lib/auth');
      
      // Try to refresh the token first
      const token = await refreshAuthToken();
      
      if (!token) {
        throw new Error('Authentication token not available');
      }
      
      const response = await fetch(`/api/client/chats/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete chat');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/client/chats'] });
      
      toast({
        title: "Chat deleted",
        description: "The conversation has been deleted successfully."
      });
    },
    onError: (error: any) => {
      console.error('Error deleting chat:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete chat",
        variant: "destructive"
      });
    }
  });
  
  // Handle chat deletion
  const handleDeleteChat = (chatId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent clicking through to the chat view
    setChatToDelete(chatId);
    setIsDeleteDialogOpen(true);
  };
  
  // Confirm chat deletion
  const confirmDeleteChat = () => {
    if (chatToDelete) {
      deleteChatMutation.mutate(chatToDelete);
      setChatToDelete(null);
    }
    setIsDeleteDialogOpen(false);
  };
  
  // Force a refresh of the data when the component mounts
  React.useEffect(() => {
    refetch();
  }, [refetch]);
  
  const handleBackToDashboard = () => {
    setLocation('/client-dashboard');
  };
  
  const handleChatClick = (chatId: number) => {
    // Redirect to freelancer-specific chat page (using chat.freelancerId if available)
    const chat = data?.chats.find((c: any) => c.id === chatId);
    if (chat?.freelancerId) {
      setLocation(`/messages/${chat.freelancerId}`);
    } else {
      setLocation(`/chat/${chatId}`);
    }
  };
  
  // Protect route for clients only
  if (!isAuthenticated || !currentUser?.isClient) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-xl font-medium text-red-600 mb-2">Access Restricted</h2>
          <p className="text-muted-foreground mb-4">
            {!isAuthenticated 
              ? 'Please sign in to access this page.' 
              : 'This page is only available to client accounts.'}
          </p>
          <Button 
            variant="outline" 
            onClick={() => setLocation('/')}
          >
            Go to Home
          </Button>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <Button variant="ghost" size="sm" onClick={handleBackToDashboard} className="mr-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <Skeleton className="h-8 w-40" />
          </div>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-40 mb-2" />
              <Skeleton className="h-4 w-60" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-60" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <Button variant="ghost" size="sm" onClick={handleBackToDashboard} className="mr-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold">My Messages</h1>
          </div>
          
          <Card className="bg-red-50">
            <CardContent className="pt-6">
              <div className="text-center p-4">
                <h2 className="text-lg font-medium text-red-600 mb-2">Failed to Load Messages</h2>
                <p className="text-sm text-red-600 mb-4">There was an error loading your messages. Please try again later.</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  const chats = data?.chats || [];
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={handleBackToDashboard} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">My Messages</h1>
        </div>
        
        {/* Delete confirmation dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this conversation? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteChat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <Card>
          <CardHeader>
            <CardTitle>Messages</CardTitle>
            <CardDescription>
              View and manage your conversations with freelancers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chats.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-25" />
                <h3 className="text-lg font-medium mb-2">No Messages Yet</h3>
                <p className="text-muted-foreground mb-4">
                  When you message a freelancer, your conversations will appear here.
                </p>
                <Button onClick={() => setLocation('/explore-freelancers')}>
                  Find Freelancers
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {chats.map((chat: any) => {
                    // Debug output to console
                    console.log('Chat data in list:', chat);
                    console.log('Freelancer data:', chat.freelancer);
                    
                    // Check if we have a freelancer object
                    if (!chat.freelancer) {
                      return null; // Skip this chat if no freelancer
                    }
                    
                    // Extract freelancer information
                    // Debugging info
                    console.log(`Chat ${chat.id} freelancer data:`, chat.freelancer);
                    
                    // Get the name and ID from the freelancer
                    const freelancerId = chat.freelancerId || '';
                    
                    // Get the name based on ID or from API response
                    let displayName;
                    
                    // Map of known freelancer names to handle all cases
                    const knownFreelancers: Record<number, string> = {
                      5: "Yawar Jabar",
                      6: "Danyar Kamaran", 
                      7: "Hamarawa Ali",
                      8: "Narmin Khalid",
                      9: "Galan Omar",
                      27: "Zhina Faraj",
                      59: "Mohammed Salim"
                    };
                    
                    // Try display name from API first
                    if (chat.freelancer.displayName && 
                        chat.freelancer.displayName !== `Freelancer ${freelancerId}` &&
                        !chat.freelancer.displayName.startsWith('User ') &&
                        !chat.freelancer.displayName.startsWith('Freelancer ')) {
                      displayName = chat.freelancer.displayName;
                    } 
                    // Use our mapping of known freelancers - safely check if ID exists
                    else if (freelancerId && knownFreelancers[freelancerId as keyof typeof knownFreelancers]) {
                      displayName = knownFreelancers[freelancerId as keyof typeof knownFreelancers];
                    } 
                    // Fallback to using user ID or freelancer ID
                    else {
                      displayName = chat.freelancer.userId ? `User ${chat.freelancer.userId}` : `Freelancer ${freelancerId}`;
                    }
                    
                    const profession = chat.freelancer.profession || '';

                    // Create the final freelancer name with profession
                    let freelancerName = displayName;
                    if (profession) {
                      freelancerName = `${displayName} (${profession})`;
                    }
                    const latestMessage = chat.latestMessage?.content || 'No messages yet';
                    const timestamp = chat.latestMessage?.createdAt 
                      ? formatDistanceToNow(new Date(chat.latestMessage.createdAt), { addSuffix: true })
                      : '';
                      
                    return (
                      <div key={chat.id} className="group">
                        <div className="flex items-start space-x-4 p-3 rounded-lg transition-colors hover:bg-muted">
                          <div 
                            className="flex items-start space-x-4 flex-1 cursor-pointer"
                            onClick={() => handleChatClick(chat.id)}
                          >
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={chat.freelancer?.imageUrl} />
                              <AvatarFallback>
                                <User className="h-6 w-6" />
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 space-y-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm">{freelancerName}</h4>
                                {chat.type === 'direct' && (
                                  <Badge variant="outline" className="text-xs">Direct Message</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {latestMessage}
                              </p>
                              {timestamp && (
                                <p className="text-xs text-muted-foreground flex items-center">
                                  <Calendar className="h-3 w-3 mr-1 inline" />
                                  {timestamp}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Actions Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => handleDeleteChat(chat.id, e)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete conversation
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <Separator className="my-2" />
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}