import React from "react";
import TypingIndicator from "./TypingIndicator";

interface ChatMessageProps {
  isUser: boolean;
  content?: React.ReactNode;
  isTyping?: boolean;
}

export default function ChatMessage({ isUser, content, isTyping = false }: ChatMessageProps) {
  // For user messages
  if (isUser) {
    return (
      <div className="flex items-start justify-end fade-in">
        <div className="chat-bubble-user bg-gray-100 px-4 py-3 rounded-[12px] max-w-[85%]">
          {typeof content === 'string' ? (
            <p className="text-gray-800">{content}</p>
          ) : (
            content
          )}
        </div>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 ml-2 overflow-hidden">
          <svg className="w-full h-full text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
          </svg>
        </div>
      </div>
    );
  }
  
  // For bot messages
  return (
    <div className="flex items-start fade-in">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center mr-2">
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"></path>
          <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"></path>
        </svg>
      </div>
      <div className="chat-bubble-bot bg-blue-50 px-4 py-3 rounded-[12px] max-w-[85%]">
        {isTyping ? (
          <TypingIndicator />
        ) : typeof content === 'string' ? (
          <p className="text-gray-800">{content}</p>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
