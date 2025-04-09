import { useState, useEffect, useRef } from "react";
import { useChat } from "@/hooks/use-chat";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import FreelancerCard from "@/components/freelancer/FreelancerCard";
import { MessageType } from "@/types";

export default function ChatInterface() {
  const { messages, sendMessage, isProcessing } = useChat();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (messageText: string) => {
    if (messageText.trim() !== "") {
      sendMessage(messageText);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="bg-white rounded-[12px] shadow-lg overflow-hidden">
        {/* Chat Header */}
        <div className="bg-primary px-4 py-3 flex items-center">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
          </div>
          <div className="ml-3">
            <h2 className="text-white font-semibold text-lg">MatchMaker AI</h2>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              <span className="text-white/80 text-xs">Online</span>
            </div>
          </div>
        </div>
        
        {/* Chat Messages */}
        <div 
          ref={chatContainerRef}
          className="p-4 overflow-y-auto h-[500px] md:h-[600px] no-scrollbar"
        >
          <div className="space-y-4">
            {messages.length === 0 ? (
              <ChatMessage
                isUser={false}
                content={
                  <>
                    <p>
                      Hi there! I'm MatchMaker AI, your personal freelance matchmaking assistant. Tell me about the project you need help with, and I'll find the perfect freelancers for you!
                    </p>
                    <p className="mt-2">
                      For example, you can say: "I need a photographer in Erbil for 3 days" or "Looking for a frontend developer with React experience for a 2-month project."
                    </p>
                  </>
                }
              />
            ) : (
              messages.map((message, index) => (
                <div key={message.id || index}>
                  <ChatMessage
                    isUser={message.isUserMessage}
                    content={message.content}
                  />
                  
                  {/* Render freelancer results if available */}
                  {!message.isUserMessage && message.freelancerResults && message.freelancerResults.length > 0 && (
                    <div className="mt-4 pl-10">
                      <p className="text-gray-800 mb-4">
                        Here are my top {message.freelancerResults.length} recommendations:
                      </p>
                      <div className="space-y-4">
                        {message.freelancerResults.map((freelancer, idx) => (
                          <FreelancerCard 
                            key={idx} 
                            freelancer={freelancer} 
                          />
                        ))}
                      </div>
                      <p className="mt-4 text-gray-800">
                        Would you like to know more about any of these freelancers? Or would you like me to find freelancers with different criteria?
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
            
            {/* Show typing indicator when processing */}
            {isProcessing && (
              <ChatMessage
                isUser={false}
                isTyping={true}
              />
            )}
          </div>
        </div>
        
        {/* Chat Input */}
        <ChatInput onSendMessage={handleSendMessage} isDisabled={isProcessing} />
      </div>
    </div>
  );
}
