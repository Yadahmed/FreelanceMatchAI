import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Star, 
  MapPin, 
  DollarSign, 
  Briefcase, 
  Calendar, 
  Clock, 
  ChevronLeft,
  MessageSquare,
  Award,
  ArrowLeft
} from 'lucide-react';

// Define the type for freelancer data
interface Freelancer {
  id: number;
  userId: number;
  displayName: string;
  profession: string;
  skills: string[];
  bio: string;
  hourlyRate: number;
  yearsOfExperience: number;
  location: string;
  imageUrl?: string;
  rating: number;
  jobPerformance: number;
  skillsExperience: number;
  responsiveness: number;
  fairnessScore: number;
  completedJobs: number;
}

export default function FreelancerDetail() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const freelancerId = params?.id ? parseInt(params.id, 10) : undefined;

  // Fetch freelancer data
  const { data: freelancer, isLoading, error } = useQuery({
    queryKey: ['/api/freelancers', freelancerId],
    queryFn: async () => {
      if (!freelancerId) throw new Error('Freelancer ID is required');
      try {
        const response = await fetch(`/api/freelancers/${freelancerId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch freelancer details');
        }
        return await response.json() as Freelancer;
      } catch (err) {
        console.error('Error fetching freelancer details:', err);
        throw err;
      }
    },
    enabled: !!freelancerId
  });

  const handleBackClick = () => {
    setLocation('/explore-freelancers');
  };

  const handleHireClick = async () => {
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: "Authentication required",
          description: "Please sign in to message this freelancer.",
          variant: "destructive"
        });
        return;
      }
      
      // Send a direct message to initiate the conversation
      const response = await fetch('/api/chat/direct-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: `Hello, I'm interested in discussing a potential project with you.`,
          freelancerId: freelancer.id
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }
      
      const data = await response.json();
      
      toast({
        title: "Message sent!",
        description: "Your message has been sent to the freelancer.",
      });
      
      // Navigate to a messages page in the future
      // For now we'll just show the success toast
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Failed to send message",
        description: error.message || "There was a problem sending your message.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button variant="outline" size="sm" className="mr-2" onClick={handleBackClick}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-2/3 mb-2" />
                <Skeleton className="h-6 w-1/3" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-2/3" />
                </div>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <Skeleton className="h-7 w-full" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !freelancer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center p-8 bg-red-50 rounded-lg">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Error Loading Freelancer</h2>
          <p className="text-red-600">We couldn't find the freelancer you're looking for. They may have been removed or the URL is incorrect.</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={handleBackClick}
          >
            Return to Freelancer List
          </Button>
        </div>
      </div>
    );
  }

  // Calculate the filled stars for rating
  const fullStars = Math.floor(freelancer.rating);
  const hasHalfStar = freelancer.rating % 1 >= 0.5;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Button variant="outline" size="sm" className="mr-2" onClick={handleBackClick}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main profile section */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-2xl mb-1">{freelancer.displayName}</CardTitle>
                  <CardDescription className="text-primary font-medium text-lg">{freelancer.profession}</CardDescription>
                </div>
                <div className="flex items-center mt-2 md:mt-0">
                  <div className="flex items-center mr-3">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-5 w-5 ${
                          i < fullStars 
                            ? 'text-yellow-500 fill-yellow-500' 
                            : i < fullStars + (hasHalfStar ? 1 : 0)
                              ? 'text-yellow-500 fill-yellow-500 opacity-50' 
                              : 'text-gray-300'
                        }`} 
                      />
                    ))}
                  </div>
                  <span className="font-semibold">{freelancer.rating.toFixed(1)}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">About</h3>
                <p className="text-muted-foreground">{freelancer.bio || "No bio provided."}</p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {freelancer.skills.map((skill, idx) => (
                    <Badge key={idx} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Location</div>
                    <div className="text-sm text-muted-foreground">{freelancer.location}</div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Hourly Rate</div>
                    <div className="text-sm text-muted-foreground">${freelancer.hourlyRate}/hr</div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Experience</div>
                    <div className="text-sm text-muted-foreground">{freelancer.yearsOfExperience} years</div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Briefcase className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Completed Jobs</div>
                    <div className="text-sm text-muted-foreground">{freelancer.completedJobs} projects</div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Award className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Performance</div>
                    <div className="text-sm text-muted-foreground">{(freelancer.jobPerformance * 100).toFixed(0)}% success rate</div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Responsiveness</div>
                    <div className="text-sm text-muted-foreground">{(freelancer.responsiveness * 100).toFixed(0)}% response rate</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Contact This Freelancer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Ready to discuss your project with {freelancer.displayName.split(' ')[0]}? Send a message to get started.</p>
              
              <Button 
                className="w-full"
                onClick={handleHireClick}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Message Now
              </Button>
              
              <div className="text-xs text-muted-foreground mt-4 pt-4 border-t">
                <p>By contacting this freelancer, you agree to our terms of service and privacy policy.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}