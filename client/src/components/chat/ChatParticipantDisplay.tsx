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
  const { data: usersData } = useQuery<{users: any[]}>({
    queryKey: ['/api/users'],
    enabled: !currentUser?.isClient && !!chatData,
  });

  if (currentUser?.isClient) {
    // Client is viewing chat with freelancer
    return (
      <span className={className}>
        {chatData?.freelancer?.displayName || 'Freelancer'}
      </span>
    );
  } else {
    // Freelancer is viewing chat with client
    if (chatData && usersData?.users) {
      const clientUser = usersData.users.find(user => user.id === chatData.userId);
      if (clientUser) {
        return (
          <span className={className}>
            {clientUser.displayName || clientUser.username || `Client (ID: ${chatData.userId})`}
          </span>
        );
      }
    }
    return <span className={className}>{chatData?.client?.displayName || 'Client'}</span>;
  }
}

export function getParticipantInitials(chatData: any, currentUser: any, usersData?: {users: any[]}) {
  if (currentUser?.isClient) {
    // Client viewing freelancer
    const name = chatData?.freelancer?.displayName || 'FR';
    return name.substring(0, 2).toUpperCase();
  } else {
    // Freelancer viewing client
    if (chatData && usersData?.users) {
      const clientUser = usersData.users.find(user => user.id === chatData.userId);
      if (clientUser) {
        const name = clientUser.displayName || clientUser.username || 'CL';
        return name.substring(0, 2).toUpperCase();
      }
    }
    return 'CL';
  }
}