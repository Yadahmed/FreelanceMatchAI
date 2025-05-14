import React from 'react';
import { InfoPanel } from "@/components/layout/InfoPanel";
import { AIChat } from '@/components/ai/AIChat';
import { Button } from '@/components/ui/button';
import { MessageSquare, Sparkles, Zap, Bot, CheckCircle2 } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function Home() {
  const { isAuthenticated, isClient } = useAuth();

  // Freelancers shouldn't see the AI assistant
  const showAIAssistant = !isAuthenticated || isClient;

  return (
    <div className="relative">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl -z-10 opacity-50"></div>
      <div className="absolute bottom-20 right-20 w-64 h-64 bg-purple-400/5 rounded-full blur-3xl -z-10"></div>
      
      <div className="container mx-auto pt-8 pb-16 px-4 min-h-screen">
        <div className="flex flex-col md:flex-row md:items-start md:space-x-8 lg:space-x-12">
          {/* Info Panel (Left side) */}
          <section className={`${showAIAssistant ? 'md:w-2/5 lg:w-2/5' : 'w-full'} py-4 md:py-8 md:sticky md:top-20`}>
            <InfoPanel />
          </section>
          
          {/* AI Assistant Interface (Right side) - Only shown for clients or unauthenticated users */}
          {showAIAssistant && (
            <section className="md:w-3/5 lg:w-3/5 flex-grow mt-8 md:mt-0">
              <div className="max-w-full mx-auto">
                <div className="flex flex-col space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="text-2xl font-bold">AI Assistant</h2>
                      <Badge variant="outline" className="bg-primary/5 text-primary">
                        <Sparkles className="mr-1 h-3 w-3" /> DeepSeek API
                      </Badge>
                    </div>
                    
                    {isAuthenticated && isClient && (
                      <Link href="/client-messages">
                        <Button className="mt-2 sm:mt-0" variant="outline">
                          <MessageSquare className="mr-2 h-4 w-4" />
                          My Messages
                        </Button>
                      </Link>
                    )}
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    Ask anything about freelancing and get instant AI-powered recommendations.
                  </div>
                </div>
                
                <Card className="border border-primary/10 shadow-md overflow-hidden">
                  <CardContent className="p-0">
                    <div className="bg-gradient-to-r from-primary/5 to-transparent p-3 border-b flex items-center space-x-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">KurdJobs AI Assistant</span>
                      <Badge variant="outline" className="text-xs ml-auto border-green-500/20 text-green-500 bg-green-500/5">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> AI Service Online
                      </Badge>
                    </div>
                    <AIChat />
                  </CardContent>
                </Card>
                
                <div className="flex justify-center mt-6">
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3" />
                    <span>Powered by DeepSeek AI with Anthropic Claude fallback</span>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
