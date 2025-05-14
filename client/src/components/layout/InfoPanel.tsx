import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'wouter';
import { ArrowRight, MessageSquare, Users, Search, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

export function InfoPanel() {
  const { isAuthenticated, isClient } = useAuth();
  
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">FreelanceMatchAI</h1>
        <p className="text-lg text-muted-foreground">
          AI-powered matchmaking for freelancers and clients
        </p>
      </div>

      <div className="flex flex-col space-y-4">
        <h2 className="text-xl font-semibold">What would you like to do?</h2>
        
        <Link href="/explore-freelancers">
          <Button variant="outline" size="lg" className="w-full justify-start h-auto py-3">
            <Users className="mr-2 h-5 w-5 text-primary" />
            <div className="text-left">
              <div className="font-medium">Browse Freelancers</div>
              <div className="text-xs text-muted-foreground">Explore our directory of qualified Kurdish freelancers</div>
            </div>
          </Button>
        </Link>
        
        {isAuthenticated && isClient && (
          <Link href="/client-messages">
            <Button variant="outline" size="lg" className="w-full justify-start h-auto py-3">
              <MessageSquare className="mr-2 h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-medium">View Messages</div>
                <div className="text-xs text-muted-foreground">Check your conversations with freelancers</div>
              </div>
            </Button>
          </Link>
        )}
        
        <div className="mt-4 pt-4 border-t">
          <Link href="/about" className="inline-flex items-center text-primary font-medium hover:underline">
            Learn how our matching system works
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}