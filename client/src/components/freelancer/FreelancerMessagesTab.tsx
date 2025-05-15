import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquareIcon } from 'lucide-react';

// Define interfaces for TypeScript
interface ChatClient {
  id: number;
  username: string;
  displayName: string | null;
  photoURL: string | null;
}

interface ChatMessage {
  id: number;
  chatId: number;
  userId: number | null;
  freelancerId: number | null;
  content: string;
  timestamp: string;
}

interface Chat {
  id: number;
  userId: number;
  freelancerId: number | null;
  createdAt: string;
  latestMessage: ChatMessage | null;
  messageCount: number;
  client: ChatClient | null;
}

interface ChatsResponse {
  chats: Chat[];
}

export function FreelancerMessagesTab() {
  const [, setLocation] = useLocation();
  
  // Fetch chats (conversations with clients)
  const {
    data: chatsData,
    isLoading,
    error
  } = useQuery<ChatsResponse>({
    queryKey: ['/api/freelancer/chats'],
    refetchOnWindowFocus: true
  });
  
  // Extract the chats array from the response
  const chats = chatsData?.chats || [];
  
  // For debugging
  useEffect(() => {
    if (chats && chats.length > 0) {
      console.log("Freelancer Messages - All chats:", chats);
      chats.forEach((chat: Chat) => {
        console.log(`Chat ID ${chat.id} client data:`, chat.client);
      });
    }
  }, [chats]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Messages</CardTitle>
        <CardDescription>
          Conversations with your clients
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : chats && chats.length > 0 ? (
          <div className="space-y-4">
            {chats.map((chat: Chat) => {
              // Extract client display name correctly
              const client = chat.client || null;
              
              // Prioritize displayName, then username, then generic fallback
              const displayName = 
                client?.displayName || 
                client?.username || 
                `Client (${chat.userId})`;
                
              // Generate initials for avatar
              const initials = 
                (displayName && displayName.length > 0) 
                  ? displayName.substring(0, 2).toUpperCase() 
                  : "CL";
              
              return (
                <div 
                  key={chat.id} 
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setLocation(`/chat/${chat.id}`);
                  }}
                >
                  <Avatar className="h-10 w-10">
                    {client?.photoURL && (
                      <AvatarImage src={client.photoURL} alt={displayName} />
                    )}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-medium truncate">
                        {displayName}
                      </p>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {chat.latestMessage ? new Date(chat.latestMessage.timestamp).toLocaleDateString() : 'No messages'}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {chat.latestMessage?.content || 'No messages yet'}
                    </p>
                  </div>
                  {chat.messageCount > 0 && (
                    <div className="bg-primary text-primary-foreground text-xs rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
                      {chat.messageCount}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <MessageSquareIcon className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Messages Yet</h3>
            <p className="text-muted-foreground max-w-md">
              You don't have any message threads at the moment. When clients contact you, conversations will appear here.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}