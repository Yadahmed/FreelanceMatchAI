import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InfoPanel } from "@/components/layout/InfoPanel";
import { AIChat } from '@/components/ai/AIChat';
import { JobAnalysis } from '@/components/ai/JobAnalysis';
import { DirectAIChat } from '@/components/ai/DirectAIChat';

export default function Home() {
  const [activeTab, setActiveTab] = useState('chat');
  
  return (
    <div className="container mx-auto pt-6 pb-6 px-4 min-h-screen flex flex-col md:flex-row md:items-start md:space-x-6">
      {/* Info Panel (Left side) */}
      <section className="md:w-1/3 lg:w-2/5 py-8 md:py-12 md:sticky md:top-20">
        <InfoPanel />
      </section>
      
      {/* AI Assistant Interface (Right side) */}
      <section className="md:w-2/3 lg:w-3/5 flex-grow mt-6 md:mt-0">
        <div className="max-w-full mx-auto">
          <h2 className="text-2xl font-bold mb-6">AI Assistant</h2>
          
          <Tabs defaultValue="chat" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-center mb-6">
              <TabsList>
                <TabsTrigger value="chat">DeepSeek R1 Chat</TabsTrigger>
                <TabsTrigger value="job-analysis">Job Analysis</TabsTrigger>
                <TabsTrigger value="direct-chat">Direct Chat</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="chat" className="focus:outline-none">
              <AIChat />
            </TabsContent>
            
            <TabsContent value="job-analysis" className="focus:outline-none">
              <JobAnalysis />
            </TabsContent>
            
            <TabsContent value="direct-chat" className="focus:outline-none">
              <DirectAIChat />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}
