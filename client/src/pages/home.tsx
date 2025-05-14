import React from 'react';
import { InfoPanel } from "@/components/layout/InfoPanel";
import { AIChat } from '@/components/ai/AIChat';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';

export default function Home() {
  const { isAuthenticated, isClient } = useAuth();

  return (
    <div className="container mx-auto pt-6 pb-6 px-4 min-h-screen flex flex-col md:flex-row md:items-start md:space-x-6">
      {/* Info Panel (Left side) */}
      <section className="md:w-1/3 lg:w-2/5 py-8 md:py-12 md:sticky md:top-20">
        <InfoPanel />
      </section>
      
      {/* AI Assistant Interface (Right side) */}
      <section className="md:w-2/3 lg:w-3/5 flex-grow mt-6 md:mt-0">
        <div className="max-w-full mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h2 className="text-2xl font-bold">AI Assistant</h2>
            
            {isAuthenticated && isClient && (
              <Link href="/client-messages">
                <Button className="mt-2 sm:mt-0" variant="outline">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  My Messages
                </Button>
              </Link>
            )}
          </div>
          
          <div className="bg-background border rounded-lg shadow-sm">
            <AIChat />
          </div>
        </div>
      </section>
    </div>
  );
}
