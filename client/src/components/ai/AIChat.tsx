import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { sendAIMessage, checkAIStatus } from '@/lib/ai-service';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Loader2, Send, AlertCircle, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiRequest } from '@/lib/queryClient';
import { FreelancerMention } from '../chat/FreelancerMention';

// Interface for AI status response
interface AIStatusResponse {
  available: boolean;
  services?: {
    deepseek: boolean;
    anthropic: boolean;
    ollama: boolean;
    original: boolean;
  };
  primaryService?: 'deepseek' | 'anthropic' | 'ollama' | null;
}

interface AIChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  clarifyingQuestions?: string[];
  needsMoreInfo?: boolean;
  freelancerMatches?: any[]; // Freelancer matches returned from the AI
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export function AIChat() {
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);
  const [isAIAvailable, setIsAIAvailable] = useState<boolean | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // State for tracking which AI service is being used
  const [activeService, setActiveService] = useState<'deepseek' | 'anthropic' | 'ollama' | null>(null);
  
  // Check if AI service is available on mount
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        // Force AI to be available in development mode
        const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
        
        if (isDevelopment) {
          console.log("Development mode detected - forcing AI availability");
          setIsAIAvailable(true);
          setActiveService('anthropic');
          
          // Add welcome message for development mode
          setMessages([
            {
              id: generateId(),
              content: "Hi there! I'm FreelanceAI, your intelligent assistant. How can I help you today? You can ask me to find freelancers for your project or help you understand how our marketplace works.",
              isUser: false,
              timestamp: new Date(),
            },
          ]);
          return;
        }
      
        console.log("Checking AI availability from AIChat component...");
        // Get detailed status information
        const statusResponse = await checkAIStatus(true) as AIStatusResponse;
        console.log("AI status response in AIChat:", statusResponse);
        
        const available = statusResponse.available;
        
        // Force availability if any services are available
        const services = statusResponse.services || { deepseek: false, anthropic: false, ollama: false, original: false };
        const forceAvailable = services.deepseek || services.anthropic || services.ollama;
        
        setIsAIAvailable(available || forceAvailable);
        
        // Set the active service - prefer deepseek, then anthropic, then fallback to ollama
        if (statusResponse.services?.deepseek) {
          setActiveService('deepseek');
        } else if (statusResponse.services?.anthropic) {
          setActiveService('anthropic');
        } else if (statusResponse.services?.ollama) {
          setActiveService('ollama');
        } else {
          setActiveService(statusResponse.primaryService || null);
        }
        
        if (!available) {
          // Check which specific services are unavailable
          const services = statusResponse.services || { deepseek: false, anthropic: false, ollama: false, original: false };
          console.log("AI services status:", services);
          
          // Fix for the case where services might be available but not recognized
          const isAnyServiceActuallyAvailable = services.deepseek || services.anthropic || services.ollama;
          if (isAnyServiceActuallyAvailable && !available) {
            console.log("Services available but status reports unavailable, correcting...");
            setIsAIAvailable(true);
            setActiveService(services.deepseek ? 'deepseek' : 'ollama');
            
            // Add welcome message
            let welcomeMessage = "Hi there! I'm FreelanceAI, your intelligent assistant";
            if (services.deepseek) {
              welcomeMessage += " powered by DeepSeek R1 API.";
            } else if (services.anthropic) {
              welcomeMessage += " powered by Anthropic AI.";
            } else if (services.ollama) {
              welcomeMessage += " (using Ollama as a fallback service).";
            } else {
              welcomeMessage += ".";
            }
            
            welcomeMessage += " How can I help you today? You can ask me to find freelancers for your project or help you understand how our marketplace works.";
            
            setMessages([
              {
                id: generateId(),
                content: welcomeMessage,
                isUser: false,
                timestamp: new Date(),
              },
            ]);
            
            return;
          }
          
          let unavailableMessage = "Welcome to our freelance marketplace! I'm your AI assistant, but I'm currently unavailable. ";
          
          // Provide more specific information based on which service is unavailable
          if (!services.deepseek && !services.ollama) {
            unavailableMessage += "All AI services are offline. Our team is working on it and I'll be back soon!";
          } else if (!services.deepseek && services.ollama) {
            unavailableMessage += "The DeepSeek R1 API service is unavailable, but Ollama might work as a fallback.";
          } else {
            unavailableMessage += "Our team is working on it and I'll be back soon!";
          }
          
          setMessages([
            {
              id: generateId(),
              content: unavailableMessage,
              isUser: false,
              timestamp: new Date(),
            },
          ]);
        } else {
          // Generate a welcome message based on which service is being used
          let welcomeMessage = "Hi there! I'm FreelanceAI, your intelligent assistant";
          
          if (activeService === 'deepseek') {
            welcomeMessage += " powered by DeepSeek R1 API.";
          } else if (activeService === 'anthropic') {
            welcomeMessage += " powered by Anthropic AI.";
          } else if (activeService === 'ollama') {
            welcomeMessage += " (using Ollama as a fallback service).";
          } else {
            welcomeMessage += ".";
          }
          
          welcomeMessage += " How can I help you today? You can ask me to find freelancers for your project or help you understand how our marketplace works.";
          
          // Fetch freelancers to show in welcome message
          let topFreelancers = [];
          try {
            const res = await fetch('/api/freelancers?limit=3', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include'
            });
            
            if (res.ok) {
              topFreelancers = await res.json();
              // Sort by rating to get top freelancers
              topFreelancers = [...topFreelancers]
                .sort((a, b) => {
                  const ratingA = a.rating !== undefined ? a.rating : 0;
                  const ratingB = b.rating !== undefined ? b.rating : 0;
                  return ratingB - ratingA;
                })
                .slice(0, 3);
              console.log("Loaded top freelancers for welcome message:", topFreelancers);
            }
          } catch (error) {
            console.error("Failed to load top freelancers:", error);
          }
          
          setMessages([
            {
              id: generateId(),
              content: welcomeMessage,
              isUser: false,
              timestamp: new Date(),
              // Add top freelancers to the welcome message
              freelancerMatches: topFreelancers.length > 0 ? topFreelancers : undefined
            },
          ]);
        }
      } catch (error) {
        console.error('Error checking AI status:', error);
        setIsAIAvailable(false);
        setActiveService(null);
        toast({
          title: 'AI Assistant Unavailable',
          description: 'The AI service is currently unavailable. Please try again later.',
          variant: 'destructive',
        });
      }
    };
    
    checkAvailability();
  }, [toast]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !isAIAvailable) return;
    
    // Add user message to chat
    const userMessage: AIChatMessage = {
      id: generateId(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      // Send message to AI service
      const response = await sendAIMessage(userMessage.content);
      
      // Check if the response metadata indicates a change in provider
      if (response.metadata?.provider) {
        // Update the active service based on the provider used for this response
        const newService = response.metadata.provider as 'deepseek' | 'anthropic' | 'ollama';
        
        if (newService !== activeService) {
          setActiveService(newService);
          
          // Show informative message based on fallback
          if (newService === 'anthropic' && activeService === 'deepseek') {
            setMessages(prev => [
              ...prev, 
              {
                id: generateId(),
                content: "Note: I'm now using Anthropic AI as a fallback service because DeepSeek R1 is currently unavailable. I'll continue to assist you with the best available service.",
                isUser: false,
                timestamp: new Date(),
              }
            ]);
          } else if (newService === 'ollama' && (activeService === 'deepseek' || activeService === 'anthropic')) {
            setMessages(prev => [
              ...prev, 
              {
                id: generateId(),
                content: "Note: I'm now using Ollama as a fallback service because other AI services are currently unavailable. I'll continue to assist you with the best available service.",
                isUser: false,
                timestamp: new Date(),
              }
            ]);
          }
        }
      }
      
      // Check if the response contains clarifying questions
      const hasClarifyingQuestions = !!(
        (Array.isArray(response.clarifyingQuestions) && response.clarifyingQuestions.length > 0) || 
        (Array.isArray(response.metadata?.clarifyingQuestions) && response.metadata?.clarifyingQuestions.length > 0) || 
        response.metadata?.needsMoreInfo
      );
      
      // Check for freelancer matches in any format
      let matches = [];
      if (response.metadata?.matches && Array.isArray(response.metadata.matches)) {
        matches = response.metadata.matches;
      } else if (response.metadata?.freelancerMatches && Array.isArray(response.metadata.freelancerMatches)) {
        matches = response.metadata.freelancerMatches;
      } else if ((response as any).matches && Array.isArray((response as any).matches)) {
        matches = (response as any).matches;
      } else if ((response as any).freelancerMatches && Array.isArray((response as any).freelancerMatches)) {
        matches = (response as any).freelancerMatches;
      }
      
      // Add AI response to chat
      const aiMessage: AIChatMessage = {
        id: generateId(),
        content: response.content,
        isUser: false,
        timestamp: new Date(),
        clarifyingQuestions: response.clarifyingQuestions || response.metadata?.clarifyingQuestions,
        needsMoreInfo: response.needsMoreInfo || response.metadata?.needsMoreInfo,
        // Store any freelancer matches that were found
        freelancerMatches: matches
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Invalidate freelancer query cache if the message might have triggered a search
      if (
        userMessage.content.toLowerCase().includes('find freelancer') ||
        userMessage.content.toLowerCase().includes('looking for') ||
        userMessage.content.toLowerCase().includes('need someone to')
      ) {
        queryClient.invalidateQueries({ queryKey: ['/api/freelancers'] });
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to get a response from the AI assistant',
        variant: 'destructive',
      });
      
      // Add error message to chat
      setMessages(prev => [
        ...prev,
        {
          id: generateId(),
          content: "I'm sorry, I encountered an error while processing your request. Please try again later.",
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  /**
   * Improve the current prompt using AI assistance
   * This helps users craft better prompts to get more relevant freelancer-related responses
   */
  const improvePrompt = async () => {
    if (!inputValue.trim() || !isAIAvailable || isImprovingPrompt) return;
    
    setIsImprovingPrompt(true);
    
    try {
      // Ask the AI to improve the prompt for better results
      // Use direct fetch instead of apiRequest to avoid cross-origin issues
      const response = await fetch('/api/ai/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: `Please rewrite the following prompt to be more effective for our freelance marketplace AI assistant. Make it specific, detailed, and clear: "${inputValue}"`,
          metadata: { 
            direct: true,
            model: "claude-3-7-sonnet-20250219",
            system: "You are a helpful AI prompt improvement assistant. Your task is to rewrite user messages to be more effective when communicating with a freelance marketplace AI. Focus on making prompts more specific, detailed, and clear. Never mention that you're rewriting the prompt - just provide the improved version."
          }
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      
      let improvedPrompt = '';
      
      if (result.content) {
        // Normal API response
        improvedPrompt = result.content;
      } else if (result.response) {
        // Legacy API response format
        improvedPrompt = result.response;
      }
      
      // Remove any quotes that might be in the response
      const cleanPrompt = improvedPrompt.replace(/^["']|["']$/g, '');
      setInputValue(cleanPrompt);
      
      // Show a toast notification that the prompt was improved
      toast({
        title: "Prompt Improved",
        description: "Your prompt has been enhanced for better results.",
      });
      
    } catch (error: any) {
      console.error('Error improving prompt:', error);
      toast({
        title: 'Error',
        description: "Couldn't improve your prompt. Please try again.",
        variant: 'destructive',
      });
    } finally {
      setIsImprovingPrompt(false);
    }
  };
  
  if (isAIAvailable === null) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Connecting to AI assistant...</p>
      </div>
    );
  }
  
  return (
    <Card className="flex flex-col h-[600px] md:h-[700px] overflow-hidden shadow-lg border-0 bg-background">
      {/* Status bar */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 flex items-center text-white">
        <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 8v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"></path>
            <path d="M19 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
            <polyline points="7 8 12 13 17 8"></polyline>
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-white">
            KurdJobs AI Assistant
          </h3>
          <div className="flex items-center">
            {isAIAvailable ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-300 mr-2" />
                <span className="text-xs text-white/80">AI Service Online</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-red-300 mr-2" />
                <span className="text-xs text-white/80">Offline</span>
                <span className="text-xs ml-2 bg-red-400/30 px-1 rounded">
                  Service Unavailable
                </span>
              </>
            )}
            
            {/* Show which service is active */}
            {isAIAvailable && activeService && (
              <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-white/20 text-white/90 border border-white/20">
                {activeService === 'deepseek' && 'DeepSeek API'}
                {activeService === 'anthropic' && 'Anthropic API'}
                {activeService === 'ollama' && 'Local Ollama'}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Messages area */}
      <ScrollArea className="flex-1 px-4 py-6">
        <div className="space-y-6">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!message.isUser && (
                <div className="w-8 h-8 mr-2 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex-shrink-0 flex items-center justify-center text-white font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                </div>
              )}
              <div
                className={`max-w-[80%] p-4 rounded-xl shadow-sm ${
                  message.isUser
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white'
                    : 'bg-background border border-border dark:text-foreground'
                }`}
              >
                {message.isUser ? (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <div className="whitespace-pre-wrap">
                    {/* If there are freelancer matches, render the plain text without processing - 
                        the cards will be rendered separately below */}
                    {message.freelancerMatches && message.freelancerMatches.length > 0 ? (
                      <div>{message.content}</div>
                    ) : (
                      /* Otherwise, process the text for any inline freelancer mentions */
                      <FreelancerMention content={message.content} />
                    )}
                  </div>
                )}
                
                {/* Render clarifying questions as buttons if present */}
                {!message.isUser && message.clarifyingQuestions && message.clarifyingQuestions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {message.needsMoreInfo ? "I need more information:" : "Suggested questions:"}
                    </p>
                    <div className="flex flex-col gap-2">
                      {message.clarifyingQuestions.map((question, index) => (
                        <Button 
                          key={index} 
                          variant="outline" 
                          size="sm" 
                          className="justify-start text-left h-auto py-2"
                          onClick={() => {
                            setInputValue(question);
                            // Focus the textarea
                            const textarea = document.querySelector('textarea');
                            if (textarea) {
                              textarea.focus();
                            }
                          }}
                        >
                          {question}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Render freelancer matches with cards if present */}
                {!message.isUser && message.freelancerMatches && message.freelancerMatches.length > 0 && (
                  <div className="mt-4 p-0 rounded-xl overflow-hidden border border-border/40 bg-background">
                    <div className="bg-gradient-to-r from-primary to-primary/80 p-4 text-white">
                      <h4 className="font-medium text-lg">
                        {message.id === messages[0]?.id 
                          ? "Top Matched Freelancers" 
                          : "Recommended Freelancers"}
                      </h4>
                      <p className="text-sm text-white/80 mt-1">
                        {message.id === messages[0]?.id
                          ? "These freelancers match your requirements"
                          : "Based on your specific requirements"}
                      </p>
                    </div>
                    
                    <div className="p-4 bg-background">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {message.freelancerMatches.slice(0, 3).map((match, index) => {
                          // Get freelancer ID and name from the match data
                          const freelancer = match.freelancer || match;
                          const freelancerId = match.freelancerId || freelancer.id;
                          
                          if (!freelancerId) return null;
                          
                          // Get name and other details
                          const name = freelancer.displayName || 
                            (freelancer.username ? freelancer.username : `Freelancer ${freelancerId}`);
                          
                          // Get skills and other details
                          const skills = freelancer.skills || [];
                          const profession = freelancer.profession || "Freelancer";
                          const location = freelancer.location || "";
                          const rating = freelancer.rating || 5;
                          const hourlyRate = freelancer.hourlyRate || 25;
                          
                          return (
                            <div 
                              key={`freelancer-card-${index}`}
                              className="border border-border rounded-lg shadow-sm hover:shadow-md transition-all bg-background overflow-hidden flex flex-col"
                            >
                              <div className="p-4 border-b border-border/10 bg-muted/30 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-lg">
                                    {typeof name === 'string' ? name.charAt(0) : 'F'}
                                  </div>
                                  <div>
                                    <h5 className="font-medium text-foreground">{typeof name === 'string' ? name : `Freelancer ${freelancerId}`}</h5>
                                    <p className="text-xs text-muted-foreground">{profession} in {location}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded-full">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                  <span className="text-sm font-medium">{rating}/5</span>
                                </div>
                              </div>
                              
                              <div className="p-4 flex-grow">
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {skills.slice(0, 3).map((skill: string, i: number) => (
                                    <span key={`skill-${i}`} className="inline-flex items-center px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                                      {skill}
                                    </span>
                                  ))}
                                  {skills.length > 3 && (
                                    <span className="inline-flex items-center px-2 py-1 bg-muted/50 text-muted-foreground text-xs font-medium rounded-full">
                                      +{skills.length - 3} more
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground mb-4">
                                  <span className="font-medium">${hourlyRate}/hr</span> · {freelancer.yearsOfExperience || 5} years experience
                                </div>
                              </div>
                              
                              <div className="p-3 border-t border-border/10 flex gap-2">
                                <a 
                                  href={`/freelancer/${freelancerId}`}
                                  className="flex-1 text-center py-2 px-3 border border-border/20 rounded-md text-foreground text-sm font-medium hover:bg-accent transition-colors"
                                >
                                  View Profile
                                </a>
                                <a 
                                  href={`/messages/${freelancerId}`}
                                  className="flex-1 text-center py-2 px-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary rounded-md text-white text-sm font-medium transition-colors"
                                >
                                  Chat Now
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="mt-4 flex justify-center">
                        <a 
                          href="/explore-freelancers"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-primary text-sm font-medium
                                    bg-background border border-primary/20 hover:bg-primary/5 hover:border-primary/30
                                    shadow-sm hover:shadow-md transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                          </svg>
                          Explore All Freelancers
                        </a>
                      </div>
                    </div>
                  </div>
                )}
                
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Input area */}
      <div className="p-4 border-t bg-background shadow-inner">
        <div className="flex gap-2 relative">
          <Textarea
            placeholder={isAIAvailable 
              ? "Ask me about finding freelancers..." 
              : "AI Assistant is currently offline"}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[70px] resize-none px-4 py-3 pr-[140px] rounded-xl border-primary/20 focus:border-primary focus:ring-primary/20"
            disabled={!isAIAvailable || isLoading || isImprovingPrompt}
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-1">
            <Button
              onClick={improvePrompt}
              disabled={!isAIAvailable || isLoading || isImprovingPrompt || !inputValue.trim()}
              variant="outline"
              size="sm"
              className="h-8 px-3 border-primary/20 bg-background text-foreground hover:bg-accent"
              title="Improve prompt"
            >
              {isImprovingPrompt ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 mr-1" />
              )}
              <span className="text-xs">Enhance</span>
            </Button>
            
            <Button
              onClick={handleSendMessage}
              disabled={!isAIAvailable || isLoading || isImprovingPrompt || !inputValue.trim()}
              variant="default"
              size="sm"
              className="h-8 px-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary"
              title="Send message"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Send className="h-3.5 w-3.5 mr-1" />
              )}
              <span className="text-xs">Send</span>
            </Button>
          </div>
        </div>
        
        {/* Prompt helper text */}
        {inputValue.trim() && inputValue.length < 20 && isAIAvailable && (
          <div className="mt-2 text-xs text-muted-foreground p-2 bg-primary/5 rounded border border-primary/10">
            <p><strong>Tip:</strong> More specific prompts get better results. Try adding details like:</p>
            <ul className="list-disc list-inside ml-2 mt-1">
              <li>Type of freelancer you need (developer, designer, writer)</li>
              <li>Required skills and experience level</li>
              <li>Budget range and timeline</li>
              <li>Project details and deliverables</li>
            </ul>
            <p className="mt-1">Or use the ✨ button to automatically improve your prompt!</p>
          </div>
        )}
        
        {/* Service status message */}
        {!isAIAvailable && (
          <div className="flex items-center justify-center mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
            <AlertCircle className="h-4 w-4 mr-1" />
            The AI service is currently unavailable. Our team is working on it.
          </div>
        )}
      </div>
    </Card>
  );
}