import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AIChat } from '@/components/ai/AIChat';
import { OllamaChat } from '@/components/ai/OllamaChat';
import { JobAnalysis } from '@/components/ai/JobAnalysis';
import { OllamaJobAnalysis } from '@/components/ai/OllamaJobAnalysis';
import { Badge } from '@/components/ui/badge';

export default function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState('chat');
  
  return (
    <div className="container mx-auto py-6 px-2 md:py-8 md:px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">AI Assistant</h1>
          <Badge variant="outline" className="bg-primary-50 text-primary border-primary-100">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            AI Services Online
          </Badge>
        </div>
        
        <Tabs defaultValue="chat" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-4">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="chat" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                AI Chat
              </TabsTrigger>
              <TabsTrigger value="job-analysis" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Job Analysis
              </TabsTrigger>
              <TabsTrigger value="ollama-chat" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Direct Chat
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="chat" className="focus:outline-none">
            <AIChat />
          </TabsContent>
          
          <TabsContent value="ollama-chat" className="focus:outline-none">
            <OllamaChat />
          </TabsContent>
          
          <TabsContent value="job-analysis" className="focus:outline-none">
            <JobAnalysis />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}