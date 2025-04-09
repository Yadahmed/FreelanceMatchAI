import { useState, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { MessageType } from '@/types';

export const useChat = () => {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatId, setChatId] = useState<number | null>(null);
  const { toast } = useToast();

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    
    // Add user message to UI immediately
    const userMessage: MessageType = {
      id: Date.now(),
      content,
      isUserMessage: true,
      timestamp: new Date(),
      freelancerResults: null
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    
    try {
      // Make API request to get AI response
      const response = await apiRequest('POST', '/api/chat-message', {
        message: content,
        chatId: chatId
      });
      
      const responseData = await response.json();
      
      // Set chat ID if it's new
      if (!chatId && responseData.chatId) {
        setChatId(responseData.chatId);
      }
      
      // Add bot response to messages
      if (responseData.message) {
        const botMessage: MessageType = {
          id: responseData.message.id,
          content: responseData.message.content,
          isUserMessage: false,
          timestamp: new Date(responseData.message.timestamp),
          freelancerResults: responseData.freelancers || null
        };
        
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to process your message. Please try again.',
        variant: 'destructive',
      });
      
      // Add error message
      const errorMessage: MessageType = {
        id: Date.now(),
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        isUserMessage: false,
        timestamp: new Date(),
        freelancerResults: null
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  }, [chatId, toast]);

  return {
    messages,
    sendMessage,
    isProcessing,
    chatId
  };
};
