import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';

type ChatParticipantDisplayProps = {
  chatData: any;
  className?: string;
};

export function ChatParticipantDisplay({ chatData, className = '' }: ChatParticipantDisplayProps) {
  const { currentUser } = useAuth();
  
  // Fetch users data to get client names
  const { data: usersData } = useQuery<any[]>({
    queryKey: ['/api/users'],
    enabled: !currentUser?.isClient && !!chatData,
  });

  if (!chatData) {
    return <span className={className}>Loading...</span>;
  }

  if (currentUser?.isClient) {
    // Client is viewing chat with freelancer
    return (
      <span className={className}>
        {chatData?.freelancer?.displayName || 'Freelancer'}
      </span>
    );
  } else {
    // Freelancer is viewing chat with client
    if (usersData) {
      const clientUser = usersData.find((user: any) => user.id === chatData.userId);
      if (clientUser) {
        return (
          <span className={className}>
            {clientUser.displayName || clientUser.username || `Client (ID: ${chatData.userId})`}
          </span>
        );
      }
    }
    
    // Fallback if we can't find the user
    return <span className={className}>Client</span>;
  }
}

export function getParticipantInitials(chatData: any, currentUser: any): string {
  if (!chatData) return 'NA';
  
  if (currentUser?.isClient) {
    // Client viewing freelancer
    const name = chatData?.freelancer?.displayName || 'FR';
    return name.substring(0, 2).toUpperCase();
  } else {
    // Freelancer viewing client - simplified version without needing usersData
    return 'CL';
  }
}