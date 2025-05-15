import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { 
  ChevronRight, 
  DollarSign, 
  Briefcase, 
  Star, 
  BarChart, 
  FileSearch, 
  Bell,
  MessageSquare,
  Calendar,
  Clock as ClockIcon
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

// Define TypeScript interfaces for dashboard data
interface FreelancerProfile {
  id: number;
  userId: number;
  profession: string;
  bio: string;
  skills: string[];
  hourlyRate: number;
  yearsOfExperience: number | null;
  rating: number | null;
  completedJobs?: number;
  imageUrl: string | null;
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
  matchScore?: number;
  jobPerformance?: number;
  skillsExperience?: number;
  responsiveness?: number;
  fairnessScore?: number;
  location?: string;
}

interface FreelancerStats {
  completedJobsCount: number;
  averageRating: number | null;
  pendingRequests?: number;
  acceptedRequests?: number;
  completedRequests?: number;
  totalRequests?: number;
  totalEarnings?: number;
  thisMonthEarnings?: number;
}

interface DashboardData {
  freelancer: FreelancerProfile;
  stats: FreelancerStats;
  jobRequests?: any[];
  bookings?: any[];
  notifications?: any[];
  recentReviews?: any[];
}

interface JobRequest {
  id: number;
  clientId: number;
  freelancerId: number;
  title: string;
  description: string;
  budget: number;
  skills: string[];
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  createdAt: string;
  updatedAt: string;
  client?: {
    id: number;
    displayName: string;
    photoURL?: string;
  };
}

export function FreelancerHome() {
  const { currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedTab, setSelectedTab] = useState("overview");
  const queryClient = useQueryClient();
  
  // Fetch freelancer dashboard data
  const { 
    data: dashboardData, 
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard
  } = useQuery({
    queryKey: ['/api/freelancer/dashboard'],
    enabled: !!currentUser && !currentUser.isClient,
    refetchOnWindowFocus: true
  });
  
  // Refetch dashboard data periodically to get updated data
  useEffect(() => {
    const interval = setInterval(() => {
      refetchDashboard();
    }, 10000); // Refetch every 10 seconds
    
    return () => clearInterval(interval);
  }, [refetchDashboard]);
  
  // Fetch job requests
  const { 
    data: jobRequests,
    isLoading: jobRequestsLoading,
    error: jobRequestsError
  } = useQuery({
    queryKey: ['/api/freelancer/job-requests'],
    enabled: !!currentUser && !currentUser.isClient
  });
  
  // Fetch notifications
  const { 
    data: notifications,
    isLoading: notificationsLoading,
    error: notificationsError
  } = useQuery({
    queryKey: ['/api/freelancer/notifications'],
    enabled: !!currentUser && !currentUser.isClient
  });
  
  // Fetch chats (conversations with clients)
  const {
    data: chats,
    isLoading: chatsLoading,
    error: chatsError
  } = useQuery({
    queryKey: ['/api/freelancer/chats'],
    enabled: !!currentUser && !currentUser.isClient
  });

  const handleAcceptRequest = async (requestId: number) => {
    try {
      await apiRequest(`/api/freelancer/job-requests/${requestId}/accept`, {
        method: 'POST'
      });
      
      // Invalidate cache to reflect updates
      queryClient.invalidateQueries({ queryKey: ['/api/freelancer/job-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/freelancer/dashboard'] });
    } catch (error) {
      console.error('Error accepting job request:', error);
    }
  };
  
  const handleRejectRequest = async (requestId: number) => {
    try {
      await apiRequest(`/api/freelancer/job-requests/${requestId}/reject`, {
        method: 'POST'
      });
      
      // Invalidate cache to reflect updates
      queryClient.invalidateQueries({ queryKey: ['/api/freelancer/job-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/freelancer/dashboard'] });
    } catch (error) {
      console.error('Error rejecting job request:', error);
    }
  };
  
  // Loading state
  const isLoading = dashboardLoading || jobRequestsLoading || notificationsLoading || chatsLoading;
  const hasError = dashboardError || jobRequestsError || notificationsError || chatsError;
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 animate-pulse rounded"></div>
          <div className="h-10 w-40 bg-gray-200 dark:bg-gray-800 animate-pulse rounded"></div>
        </div>
        <div className="h-12 w-full bg-gray-200 dark:bg-gray-800 animate-pulse rounded"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-32 bg-gray-200 dark:bg-gray-800 animate-pulse rounded"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-800 animate-pulse rounded"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-800 animate-pulse rounded"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-800 animate-pulse rounded"></div>
        </div>
      </div>
    );
  }
  
  if (hasError) {
    return (
      <div className="p-4 text-center">
        <p className="text-destructive mb-4">There was an error loading your dashboard.</p>
        <Button onClick={() => window.location.reload()}>Refresh Page</Button>
      </div>
    );
  }

  const freelancer = dashboardData?.freelancer;
  const stats = dashboardData?.stats;
  
  // Format stats with defaults
  const totalEarnings = stats?.totalEarnings || 0;
  const thisMonthEarnings = stats?.thisMonthEarnings || 0;
  const completedJobs = stats?.completedJobsCount || 0;
  const totalHours = 0; // This data might not be available yet
  const rating = stats?.averageRating || 0;
  const pendingRequests = stats?.pendingRequests || 0;
  
  // Calculate match score as 0-100 percentage
  const matchScore = Math.round(
    ((freelancer?.jobPerformance || 0) * 50) + 
    ((freelancer?.skillsExperience || 0) * 20) + 
    ((freelancer?.responsiveness || 0) * 15) + 
    ((freelancer?.fairnessScore || 0) * 15)
  );
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Freelancer Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {currentUser?.displayName || currentUser?.username}
          </p>
        </div>
        
        <Button onClick={() => setLocation("/freelancer-availability")}>
          Update Availability
        </Button>
      </div>
      
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-4 md:flex md:space-x-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="job-requests">Job Requests</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Earnings Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Earnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-2xl font-bold">${totalEarnings}</div>
                    <p className="text-xs text-muted-foreground">+${thisMonthEarnings} this month</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Completed Jobs Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completed Jobs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-2xl font-bold">{completedJobs}</div>
                    <p className="text-xs text-muted-foreground">{totalHours} total hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Rating Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Rating
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Star className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-2xl font-bold">{rating ? rating.toFixed(1) : "0.0"}</div>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-3 w-3 ${i < Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Match Score Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Match Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <BarChart className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-2xl font-bold mb-1">{matchScore}%</div>
                    <Progress value={matchScore} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recent Job Requests */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Recent Job Requests</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedTab("job-requests")}
                    className="text-xs"
                  >
                    View All <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="flex flex-col space-y-2">
                  {pendingRequests === 0 ? (
                    <div className="text-muted-foreground py-6 text-center">
                      <FileSearch className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      <p>No job requests yet</p>
                    </div>
                  ) : (
                    <div>{pendingRequests} requests pending</div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Recent Notifications */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Recent Notifications</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedTab("notifications")}
                    className="text-xs"
                  >
                    View All <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="flex flex-col space-y-2">
                  {(!notifications || notifications.length === 0) ? (
                    <div className="text-muted-foreground py-6 text-center">
                      <Bell className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      <p>No notifications</p>
                    </div>
                  ) : (
                    <div>
                      {notifications.length} new notifications
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="job-requests" className="py-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Requests</CardTitle>
              <CardDescription>
                View and manage incoming job requests from clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!jobRequests || jobRequests.length === 0 ? (
                <div className="py-12 text-center">
                  <FileSearch className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No job requests yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    When clients send you job requests, they will appear here. Keep your profile 
                    updated to attract more clients.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobRequests.map((request: JobRequest) => (
                    <Card key={request.id} className="overflow-hidden">
                      <div className="p-4 border-b bg-muted/30">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{request.title}</h3>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <ClockIcon className="h-3 w-3 mr-1" />
                              <span>
                                {new Date(request.createdAt).toLocaleDateString()}
                              </span>
                              <Badge variant="outline" className="ml-2">
                                {request.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">${request.budget}</div>
                            <div className="text-xs text-muted-foreground">Budget</div>
                          </div>
                        </div>
                      </div>
                      <CardContent className="pt-4">
                        <p className="text-sm mb-4 line-clamp-2">{request.description}</p>
                        
                        {request.skills && request.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {request.skills.map((skill, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {request.client && (
                          <div className="flex items-center mt-2">
                            <Avatar className="h-6 w-6 mr-2">
                              <AvatarImage src={request.client.photoURL || undefined} />
                              <AvatarFallback>
                                {request.client.displayName?.substring(0, 2) || 'CL'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{request.client.displayName}</span>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="border-t bg-muted/10 flex justify-end space-x-2 py-3">
                        {request.status === 'pending' && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleRejectRequest(request.id)}
                            >
                              Decline
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handleAcceptRequest(request.id)}
                            >
                              Accept
                            </Button>
                          </>
                        )}
                        {request.status === 'accepted' && (
                          <Button size="sm">
                            Message Client
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="bookings" className="py-4">
          <Card>
            <CardHeader>
              <CardTitle>Bookings</CardTitle>
              <CardDescription>
                View and manage your upcoming work schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No bookings yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  When clients book time with you, your appointments will appear here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="messages" className="py-4">
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
              <CardDescription>
                Conversations with your clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!chats || chats.length === 0 ? (
                <div className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No messages yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    When you start chatting with clients, your conversations will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* We'll implement this when we have chat data */}
                  <Button 
                    className="w-full"
                    onClick={() => setLocation("/messages")}
                  >
                    View All Messages
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}