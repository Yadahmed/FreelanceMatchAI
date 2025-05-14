import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, User, Calendar, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ClientMessagesPage() {
  const [, setLocation] = useLocation();
  const { currentUser, isAuthenticated } = useAuth();
  
  // Fetch client chats
  const { data, isLoading, error } = useQuery({
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
        if (response.status === 401) {
          throw new Error('Your session has expired. Please sign in again.');
        }
        throw new Error('Failed to fetch chats');
      }
      
      return await response.json();
    },
    enabled: !!isAuthenticated && currentUser?.isClient === true
  });
  
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
                    const freelancerName = chat.freelancer?.displayName || 'Freelancer';
                    const latestMessage = chat.latestMessage?.content || 'No messages yet';
                    const timestamp = chat.latestMessage?.createdAt 
                      ? formatDistanceToNow(new Date(chat.latestMessage.createdAt), { addSuffix: true })
                      : '';
                      
                    return (
                      <div key={chat.id} className="group">
                        <div 
                          className="flex items-start space-x-4 p-3 rounded-lg transition-colors hover:bg-muted cursor-pointer"
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
                          
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChatClick(chat.id);
                            }}
                          >
                            View
                          </Button>
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