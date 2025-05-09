import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AIChat } from '@/components/ai/AIChat';
import { OllamaChat } from '@/components/ai/OllamaChat';
import { JobAnalysis } from '@/components/ai/JobAnalysis';

export default function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState('chat');
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">AI Assistant</h1>
        
        <Tabs defaultValue="chat" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-6">
            <TabsList>
              <TabsTrigger value="chat">Chat with AI</TabsTrigger>
              <TabsTrigger value="job-analysis">Job Analysis</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="chat" className="focus:outline-none">
            <AIChat />
          </TabsContent>
          
          <TabsContent value="job-analysis" className="focus:outline-none">
            <JobAnalysis />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}