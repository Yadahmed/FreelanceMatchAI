import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Search, Award, ZapIcon, Clock } from 'lucide-react';

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
          <CardTitle className="text-lg">How It Works</CardTitle>
          <CardDescription>
            Our AI analyzes your requirements to find the perfect freelancer for your project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 bg-primary/10 p-2 rounded-full">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">1. Describe Your Needs</h3>
              <p className="text-sm text-muted-foreground">
                Tell our AI what type of freelancer you're looking for and what skills you need
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-0.5 bg-primary/10 p-2 rounded-full">
              <Search className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">2. AI Matching</h3>
              <p className="text-sm text-muted-foreground">
                Our algorithm analyzes hundreds of freelancer profiles to find your perfect match
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-0.5 bg-primary/10 p-2 rounded-full">
              <Award className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">3. Review Top Matches</h3>
              <p className="text-sm text-muted-foreground">
                Choose from ranked recommendations based on skills, experience, and performance
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Our Ranking Algorithm</CardTitle>
          <CardDescription>
            The FreelanceMatchAI algorithm ranks freelancers using four key metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 bg-primary/10 p-2 rounded-full">
              <Award className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Job Performance (50%)</h3>
              <p className="text-sm text-muted-foreground">
                Quality of work and overall client satisfaction from completed projects
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-0.5 bg-primary/10 p-2 rounded-full">
              <ZapIcon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Skills & Experience (20%)</h3>
              <p className="text-sm text-muted-foreground">
                Relevance of skills to your project and years of professional experience
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-0.5 bg-primary/10 p-2 rounded-full">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Responsiveness (15%)</h3>
              <p className="text-sm text-muted-foreground">
                Speed and reliability of communication with clients
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-0.5 bg-primary/10 p-2 rounded-full">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Fairness Boost (15%)</h3>
              <p className="text-sm text-muted-foreground">
                Ensures visibility for new talented freelancers with fewer reviews
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}