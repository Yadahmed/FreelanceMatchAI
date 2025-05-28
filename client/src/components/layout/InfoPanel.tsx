import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'wouter';
import { ArrowRight, MessageSquare, Users, Search, Briefcase, Star, Zap, Award, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';

export function InfoPanel() {
  const { isAuthenticated, isClient } = useAuth();
  
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="relative">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl -z-10"></div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl -z-10"></div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">FreelanceMatchAI</h1>
          <Badge variant="outline" className="mt-2 bg-primary/5 text-primary border-primary/20">
            <Zap className="mr-1 h-3 w-3" /> AI-Powered
          </Badge>
        </div>
        
        <p className="text-lg text-muted-foreground">
          Connecting Kurdistan's top freelance talent with global opportunities through intelligent matchmaking
        </p>
      </div>
      {/* Key Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-background to-muted/30 border border-muted-foreground/10">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full p-2 bg-primary/10 mb-2">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <span className="text-2xl font-bold">50+</span>
              <span className="text-xs text-muted-foreground">Qualified Freelancers</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-background to-muted/30 border border-muted-foreground/10">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full p-2 bg-primary/10 mb-2">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <span className="text-2xl font-bold">4.8/5</span>
              <span className="text-xs text-muted-foreground">Average Rating</span>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="flex flex-col space-y-4">
        <h2 className="text-xl font-semibold flex items-center">
          <TrendingUp className="mr-2 h-5 w-5 text-primary" />
          What would you like to do?
        </h2>
        
        <Link href="/explore-freelancers">
          <Button variant="outline" size="lg" className="w-full justify-start h-auto py-3 group hover:shadow-md transition-all border border-muted-foreground/10 bg-gradient-to-r hover:from-primary/5 hover:to-transparent">
            <Users className="mr-2 h-5 w-5 text-primary" />
            <div className="text-left">
              <div className="font-medium">Browse Freelancers</div>
              <div className="text-xs text-muted-foreground group-hover:text-muted-foreground/80">Explore our directory of qualified Kurdish freelancers</div>
            </div>
          </Button>
        </Link>
        
        {isAuthenticated && isClient && (
          <Link href="/client-messages">
            <Button variant="outline" size="lg" className="w-full justify-start h-auto py-3 group hover:shadow-md transition-all border border-muted-foreground/10 bg-gradient-to-r hover:from-primary/5 hover:to-transparent">
              <MessageSquare className="mr-2 h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-medium">View Messages</div>
                <div className="text-xs text-muted-foreground group-hover:text-muted-foreground/80">Check your conversations with freelancers</div>
              </div>
            </Button>
          </Link>
        )}
        
        <Card className="border border-primary/20 bg-primary/5 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start space-x-4">
              <div className="rounded-full p-2 bg-primary/10">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium mb-1">AI-Powered Matching</h3>
                <p className="text-sm text-muted-foreground">Our advanced algorithm connects you with the perfect freelancers for your specific needs.</p>
                <Link href="/about" className="inline-flex items-center text-primary text-sm font-medium mt-2 hover:underline">
                  Learn how it works
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}