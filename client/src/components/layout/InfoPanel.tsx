import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'wouter';
import { ArrowRight, MessageSquare, Search, Briefcase } from 'lucide-react';

export function InfoPanel() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">FreelanceMatchAI</h1>
        <p className="text-lg text-muted-foreground">
          AI-powered matchmaking for freelancers and clients
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Getting Started</CardTitle>
          <CardDescription>
            Connect with skilled Kurdish freelancers using our AI assistant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 bg-primary/10 p-2 rounded-full">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">AI Chat Assistant</h3>
              <p className="text-sm text-muted-foreground">
                Tell our AI about your project needs and get matched with the perfect freelancers
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-0.5 bg-primary/10 p-2 rounded-full">
              <Search className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Browse Freelancers</h3>
              <p className="text-sm text-muted-foreground">
                Explore our directory of qualified Kurdish freelancers with varied skills
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-0.5 bg-primary/10 p-2 rounded-full">
              <Briefcase className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Post a Job</h3>
              <p className="text-sm text-muted-foreground">
                Create a custom job request and invite freelancers to submit proposals
              </p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <Link href="/about" className="inline-flex items-center text-primary font-medium hover:underline">
              Learn how our matching system works
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}