import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Rating } from '@/components/ui/rating';
import { ReviewsList } from '@/components/review/ReviewsList';
import { ReviewForm } from '@/components/review/ReviewForm';
import { JobRequestForm } from '@/components/client/JobRequestForm';
import { 
  MapPin, 
  DollarSign, 
  Briefcase, 
  Calendar, 
  Clock, 
  MessageSquare,
  Award,
  ArrowLeft,
  Star,
  CheckCircle2,
  XCircle,
  AlertCircle
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
  rating: number | null;
  jobPerformance: number;
  skillsExperience: number;
  responsiveness: number;
  fairnessScore: number;
  completedJobs: number;
  availability?: boolean;
  availabilityDetails?: {
    status?: 'available' | 'limited' | 'unavailable';
    message?: string;
    availableFrom?: string;
    availableUntil?: string;
    workHours?: { start: string; end: string };
    workDays?: number[];
    lastUpdated?: string;
  };
}

export default function FreelancerDetail() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { currentUser, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
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
      // Import the refreshAuthToken function
      const { refreshAuthToken } = await import('@/lib/auth');
      
      // Refresh the token first to ensure it's valid
      const token = await refreshAuthToken();
      
      if (!token) {
        toast({
          title: "Authentication required",
          description: "Please sign in to message this freelancer.",
          variant: "destructive"
        });
        return;
      }
      
      // Send a direct message to initiate the conversation
      if (!freelancer) {
        throw new Error('Freelancer data is not available');
      }
      
      // First, we need to create a chat or get an existing one
      const initChatResponse = await fetch('/api/chat/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          freelancerId: freelancer.id
        })
      });
      
      if (!initChatResponse.ok) {
        // Handle authentication errors specifically
        if (initChatResponse.status === 401) {
          toast({
            title: "Session expired",
            description: "Your session has expired. Please sign in again.",
            variant: "destructive"
          });
          return;
        }
        
        const errorData = await initChatResponse.json();
        throw new Error(errorData.message || 'Failed to initialize chat');
      }
      
      const chatData = await initChatResponse.json();
      const chatId = chatData.chatId;
      
      // Now we can send a message to this chat
      const response = await fetch('/api/chat/direct-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: `Hello, I'm interested in discussing a potential project with you.`,
          chatId: chatId
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
      
      // Navigate to the chat/messages page with this freelancer
      setLocation(`/messages/${freelancer.id}`);
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

  // Handle review submission
  const handleReviewSubmitted = () => {
    // Invalidate both freelancer and reviews queries to refresh the data
    queryClient.invalidateQueries({ queryKey: ['/api/freelancers', freelancerId] });
    queryClient.invalidateQueries({ queryKey: ['freelancerReviews', freelancerId] });
    toast({
      title: "Review submitted",
      description: "Thank you for your feedback!",
    });
  };

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
                  <Rating value={freelancer.rating} size="lg" showNoRating={true} />
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
              
              {/* Reviews and Leave Review Tabs */}
              <Tabs defaultValue="reviews" className="w-full mt-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                  {isAuthenticated && currentUser?.isClient && (
                    <TabsTrigger value="leave-review">Leave a Review</TabsTrigger>
                  )}
                </TabsList>
                <TabsContent value="reviews" className="mt-4">
                  <ReviewsList freelancerId={freelancer.id} />
                </TabsContent>
                {isAuthenticated && currentUser?.isClient && (
                  <TabsContent value="leave-review" className="mt-4">
                    <ReviewForm 
                      freelancerId={freelancer.id} 
                      onReviewSubmitted={handleReviewSubmitted}
                    />
                  </TabsContent>
                )}
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar - Only show for clients or unauthenticated users */}
        {(!isAuthenticated || currentUser?.isClient) && (
          <div className="space-y-4">
            {/* Availability Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Availability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Determine availability status */}
                {(() => {
                  // Check for availabilityDetails first
                  if (freelancer.availabilityDetails?.status) {
                    const status = freelancer.availabilityDetails.status;
                    
                    if (status === 'available') {
                      return (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="font-medium">Available for Work</span>
                        </div>
                      );
                    } else if (status === 'limited') {
                      return (
                        <div className="flex items-center gap-2 text-amber-600">
                          <AlertCircle className="h-5 w-5" />
                          <span className="font-medium">Limited Availability</span>
                        </div>
                      );
                    } else if (status === 'unavailable') {
                      return (
                        <div className="flex items-center gap-2 text-red-600">
                          <XCircle className="h-5 w-5" />
                          <span className="font-medium">Not Available</span>
                        </div>
                      );
                    }
                  }
                  
                  // Fall back to the boolean availability if no details
                  return (
                    <div className={`flex items-center gap-2 ${freelancer.availability ? 'text-green-600' : 'text-red-600'}`}>
                      {freelancer.availability ? 
                        <><CheckCircle2 className="h-5 w-5" /><span className="font-medium">Available for Work</span></> : 
                        <><XCircle className="h-5 w-5" /><span className="font-medium">Not Available</span></>
                      }
                    </div>
                  );
                })()}
                
                {/* Custom availability message if available */}
                {freelancer.availabilityDetails?.message && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    "{freelancer.availabilityDetails.message}"
                  </div>
                )}
                
                {/* Work Hours */}
                {freelancer.availabilityDetails?.workHours && (
                  <div className="flex items-center mt-3 text-sm">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>
                      Works {freelancer.availabilityDetails.workHours.start} - {freelancer.availabilityDetails.workHours.end}
                    </span>
                  </div>
                )}
                
                {/* Available Date Range */}
                {(freelancer.availabilityDetails?.availableFrom || freelancer.availabilityDetails?.availableUntil) && (
                  <div className="flex items-center mt-1 text-sm">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>
                      {freelancer.availabilityDetails.availableFrom && 
                        `Available from ${new Date(freelancer.availabilityDetails.availableFrom).toLocaleDateString()}`}
                      {freelancer.availabilityDetails.availableFrom && freelancer.availabilityDetails.availableUntil && ' to '}
                      {freelancer.availabilityDetails.availableUntil && 
                        `${new Date(freelancer.availabilityDetails.availableUntil).toLocaleDateString()}`}
                    </span>
                  </div>
                )}
                
                {/* Work Days */}
                {freelancer.availabilityDetails?.workDays && freelancer.availabilityDetails.workDays.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm font-medium mb-2">Working Days</div>
                    <div className="flex flex-wrap gap-1">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                        <Badge 
                          key={index}
                          variant={freelancer.availabilityDetails?.workDays?.includes(index) ? "default" : "outline"}
                          className={freelancer.availabilityDetails?.workDays?.includes(index) 
                            ? "bg-primary/15 text-primary border-primary/30 hover:bg-primary/20" 
                            : "text-muted-foreground"
                          }
                        >
                          {day}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Contact Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Contact This Freelancer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Ready to discuss your project with {freelancer.displayName.split(' ')[0]}? Send a message or create a formal job request.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button 
                    className="w-full"
                    onClick={handleHireClick}
                    disabled={freelancer.availabilityDetails?.status === 'unavailable'}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message Now
                  </Button>
                  
                  {currentUser?.isClient && (
                    <JobRequestForm 
                      freelancerId={freelancer.id} 
                      freelancerName={freelancer.displayName}
                      trigger={
                        <Button 
                          className="w-full" 
                          disabled={freelancer.availabilityDetails?.status === 'unavailable'}
                          variant="outline"
                        >
                          <Briefcase className="h-4 w-4 mr-2" />
                          Send Job Request
                        </Button>
                      }
                    />
                  )}
                </div>
                
                {/* Show link to job requests page for clients */}
                {currentUser?.isClient && (
                  <div className="flex justify-center pt-2">
                    <Button variant="link" size="sm" asChild>
                      <a href="/job-requests">View Your Job Requests</a>
                    </Button>
                  </div>
                )}
                
                {freelancer.availabilityDetails?.status === 'unavailable' && (
                  <div className="text-sm text-red-600 mt-2">
                    This freelancer is currently unavailable for new projects.
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground mt-4 pt-4 border-t">
                  <p>By contacting this freelancer, you agree to our terms of service and privacy policy.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}