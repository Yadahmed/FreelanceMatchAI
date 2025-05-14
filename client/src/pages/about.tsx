import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Search, Award, ZapIcon, Clock } from 'lucide-react';

export default function About() {
  return (
    <div className="container max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">How It Works</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          KurdJobs AI matches you with the perfect Kurdish freelancer using our intelligent AI-powered platform
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">How It Works</CardTitle>
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

        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Our Ranking Algorithm</CardTitle>
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

      <div className="mt-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to find your perfect freelancer?</h2>
        <p className="mb-6 text-muted-foreground max-w-2xl mx-auto">
          Our AI-powered platform makes it easy to find the right talent for your project.
        </p>
        <div className="flex justify-center">
          <a href="/" className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-md font-medium">
            Get Started
          </a>
        </div>
      </div>
    </div>
  );
}