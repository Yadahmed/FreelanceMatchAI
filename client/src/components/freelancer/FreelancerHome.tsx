import { useEffect, useState, useMemo } from 'react';
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
  Clock as ClockIcon,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  createdAt: string;
  updatedAt: string;
  client?: {
    id: number;
    displayName?: string;
    username?: string;
    photoURL?: string;
  };
}

interface Booking {
  id: number;
  freelancerId: number;
  clientId: number;
  jobRequestId?: number;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'in_progress';
  createdAt: string;
  client?: {
    id: number;
    displayName?: string;
    username?: string;
    photoURL?: string;
  };
}

export function FreelancerHome() {
  const { currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [chatToDelete, setChatToDelete] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmJobAction, setConfirmJobAction] = useState<{id: number, action: 'complete' | 'quit'} | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch freelancer dashboard data
  const { 
    data: dashboardData, 
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard
  } = useQuery<DashboardData>({
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
    data: jobRequestsData,
    isLoading: jobRequestsLoading,
    error: jobRequestsError,
    refetch: refetchJobRequests
  } = useQuery<{jobRequests: JobRequest[]}>({
    queryKey: ['/api/freelancer/job-requests'],
    enabled: !!currentUser && !currentUser.isClient,
    refetchOnWindowFocus: true,
    staleTime: 0
  });
  
  // Extract the jobRequests array from the response
  const jobRequests = jobRequestsData?.jobRequests || [];
  
  // Debug log the job requests data when it changes
  useEffect(() => {
    if (jobRequestsData && jobRequestsData.jobRequests) {
      console.log('Job requests data received at:', new Date().toISOString());
      console.log('Full job requests data:', JSON.stringify(jobRequestsData));
      
      if (jobRequestsData.jobRequests.length > 0) {
        const firstRequest = jobRequestsData.jobRequests[0];
        console.log('First job request:', firstRequest);
        console.log('Client information:', 
          firstRequest.client 
            ? JSON.stringify(firstRequest.client) 
            : `No client object - Client ID: ${firstRequest.clientId}`
        );
      }
    }
  }, [jobRequestsData]);
  
  // Fetch notifications
  const { 
    data: notificationsData,
    isLoading: notificationsLoading,
    error: notificationsError,
    refetch: refetchNotifications
  } = useQuery<{notifications: any[]}>({
    queryKey: ['/api/freelancer/notifications'],
    enabled: !!currentUser && !currentUser.isClient,
    refetchOnWindowFocus: true,
    staleTime: 0
  });
  
  // Extract the notifications array from the response
  const notifications = notificationsData?.notifications || [];
  
  // Fetch chats (conversations with clients)
  const {
    data: chatsData,
    isLoading: chatsLoading,
    error: chatsError,
    refetch: refetchChats
  } = useQuery<{chats: any[]}>({
    queryKey: ['/api/freelancer/chats'],
    enabled: !!currentUser && !currentUser.isClient,
    refetchOnWindowFocus: true,
    staleTime: 0
  });
  
  // Fetch users to get client information
  const { data: usersData } = useQuery<{users: any[]}>({
    queryKey: ['/api/users'],
    enabled: !!chatsData?.chats && chatsData.chats.length > 0,
  });
  
  // Extract the chats array from the response and enrich with client data
  const chats = useMemo(() => {
    const chatsList = chatsData?.chats || [];
    const users = usersData?.users || [];
    
    return chatsList.map(chat => {
      const clientUser = users.find(user => user.id === chat.userId);
      return {
        ...chat,
        clientName: clientUser?.username || clientUser?.displayName || `Client (ID: ${chat.userId})`,
        clientInfo: clientUser || null
      };
    });
  }, [chatsData?.chats, usersData?.users]);

  // Accept a job request
  const handleAcceptRequest = async (requestId: number) => {
    try {
      // Use the API request function from lib/queryClient which automatically handles auth
      await apiRequest(`/api/freelancer/job-requests/${requestId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'accepted' })
      });
      
      toast({
        title: "Job request accepted",
        description: "You can find it in your Bookings tab",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/freelancer/job-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/freelancer/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/freelancer/dashboard'] });
      
      // Switch to the bookings tab
      setSelectedTab("bookings");
    } catch (error) {
      console.error("Error accepting job request:", error);
      toast({
        title: "Error accepting job request",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };
  
  // Decline a job request
  const handleRejectRequest = async (requestId: number) => {
    try {
      await apiRequest(`/api/freelancer/job-requests/${requestId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'declined' })
      });
      
      toast({
        title: "Job request declined",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/freelancer/job-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/freelancer/dashboard'] });
    } catch (error) {
      console.error("Error declining job request:", error);
      toast({
        title: "Error declining job request",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };
  
  // Mark a job as completed
  const handleCompleteJob = async (jobRequestId: number) => {
    try {
      // Use the dedicated endpoint for job completion
      await apiRequest(`/api/freelancer/job-requests/${jobRequestId}/complete`, {
        method: 'POST'
      });
      
      toast({
        title: "Job marked as completed",
        description: "Great work! Your match score has been increased.",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/freelancer/job-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/freelancer/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/freelancer/dashboard'] });
      setConfirmJobAction(null);
    } catch (error) {
      console.error("Error completing job:", error);
      toast({
        title: "Error completing job",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };
  
  // Quit a job (this will penalize the freelancer)
  const handleQuitJob = async (jobRequestId: number) => {
    try {
      await apiRequest(`/api/freelancer/job-requests/${jobRequestId}/quit`, {
        method: 'POST'
      });
      
      toast({
        title: "Job cancelled",
        description: "Your availability has been updated. Note that this will affect your match score.",
        variant: "destructive",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/freelancer/job-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/freelancer/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/freelancer/dashboard'] });
      setConfirmJobAction(null);
    } catch (error) {
      console.error("Error quitting job:", error);
      toast({
        title: "Error quitting job",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };
  
  // Handle messaging a client (either open existing chat or create a new one)
  const handleMessageClient = async (clientId: number, clientName?: string) => {
    try {
      // First check if a chat already exists with this client
      const existingChat = chats.find(chat => 
        chat.clientId === clientId || chat.userId === clientId
      );
      
      if (existingChat) {
        // If chat exists, navigate to it
        setLocation(`/chat/${existingChat.id}`);
        return;
      }
      
      // Otherwise create a new chat
      const response = await apiRequest('/api/chats', {
        method: 'POST',
        body: JSON.stringify({
          clientId,
          clientName: clientName || `Client ${clientId}`
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create chat');
      }
      
      const chatData = await response.json();
      
      // Navigate to the new chat
      setLocation(`/chat/${chatData.chat.id}`);
      
      // Show toast
      toast({
        title: "Chat created",
        description: `You can now message ${clientName || 'the client'}`
      });
      
    } catch (error) {
      console.error('Error creating chat:', error);
      toast({
        title: "Error creating chat",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    }
  };
  
  // Delete chat functionality
  const handleDeleteChat = (chatId: number) => {
    setChatToDelete(chatId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteChat = async () => {
    if (!chatToDelete) return;
    
    try {
      setIsDeleting(true);
      
      await apiRequest(`/api/freelancer/chats/${chatToDelete}`, {
        method: 'DELETE',
      });
      
      // Invalidate chat queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/freelancer/chats'] });
      
      toast({
        title: "Chat deleted",
        description: "The conversation has been successfully deleted.",
      });
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast({
        title: "Error",
        description: "Failed to delete the conversation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setChatToDelete(null);
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

  const typedDashboardData = dashboardData as DashboardData | undefined;
  const freelancer = typedDashboardData?.freelancer;
  const stats = typedDashboardData?.stats;
  
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
                    {/* Display match score from server */}
                    <div className="text-2xl font-bold mb-1">
                      {dashboardData?.stats?.matchScore || dashboardData?.freelancer?.calculatedMatchScore || 0}%
                    </div>
                    <Progress 
                      value={dashboardData?.stats?.matchScore || dashboardData?.freelancer?.calculatedMatchScore || 0} 
                      className="h-2" 
                    />
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
                  {notifications.length === 0 ? (
                    <div className="text-muted-foreground py-6 text-center">
                      <Bell className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      <p>No notifications yet</p>
                    </div>
                  ) : (
                    <p>{notifications.length} new notifications</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="job-requests" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Job Requests</CardTitle>
                <Badge variant="outline" className="ml-2">
                  {jobRequests.filter(req => req.status === 'pending').length} Pending
                </Badge>
              </div>
              <CardDescription>
                View and manage job requests from clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              {jobRequests.length === 0 ? (
                <div className="text-center py-8">
                  <FileSearch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Job Requests Yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    When clients send you job requests, they will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.isArray(jobRequests) && 
                    // Sort job requests by date, newest first
                    [...jobRequests]
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((request: JobRequest) => (
                    <Card key={request.id} className="overflow-hidden">
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium text-lg">{request.title}</h3>
                            <p className="text-muted-foreground text-sm">
                              From: {request.client ? 
                                   (request.client.displayName || request.client.username || `Client ${request.client.id}`) : 
                                   (request.clientId ? `Client ${request.clientId}` : "Unknown Client")}
                            </p>
                          </div>
                          <Badge 
                            className={
                              request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              request.status === 'accepted' ? 'bg-green-100 text-green-800' :
                              request.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }
                          >
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                        </div>
                        
                        <p className="mb-2">{request.description}</p>
                        
                        <div className="flex flex-wrap gap-1 mb-3">
                          {request.skills.map((skill, index) => (
                            <Badge key={index} variant="secondary">{skill}</Badge>
                          ))}
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 text-muted-foreground mr-1" />
                            <span className="font-medium">${request.budget}</span>
                          </div>
                          
                          <div className="flex gap-2">
                            {request.status === 'pending' && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-destructive hover:text-destructive"
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
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleMessageClient(request.clientId, request.client?.displayName || request.client?.username)}
                              >
                                Message Client
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="bookings" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Bookings</CardTitle>
              <CardDescription>
                Your active jobs and upcoming appointments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {jobRequests.filter(req => req.status === 'accepted').length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Active Jobs</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    When you accept job requests, they will appear here for tracking.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {jobRequests
                    .filter(req => req.status === 'accepted')
                    // Sort accepted jobs by date, newest first
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((job) => (
                      <Card key={job.id} className="overflow-hidden border-l-4 border-l-primary">
                        <div className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-medium text-lg">{job.title}</h3>
                              <p className="text-muted-foreground text-sm">
                                Client: {job.client ? 
                                  (job.client.displayName || job.client.username) : 
                                  (job.clientId ? `Client ${job.clientId}` : "Unknown Client")}
                              </p>
                            </div>
                            <Badge className="bg-green-100 text-green-800">
                              Active Job
                            </Badge>
                          </div>
                          
                          <p className="mb-4">{job.description}</p>
                          
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 text-muted-foreground mr-1" />
                              <span className="font-medium">${job.budget}</span>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm" 
                                onClick={() => handleMessageClient(job.clientId, job.client?.displayName || job.client?.username)}
                              >
                                Message Client
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive"
                                onClick={() => setConfirmJobAction({ id: job.id, action: 'quit' })}
                              >
                                Quit Job
                              </Button>
                              <Button
                                size="sm"
                                onClick={async () => {
                                  try {
                                    console.log("Attempting to complete job:", job.id);
                                    // Use apiRequest directly to complete the job
                                    const response = await apiRequest(`/api/freelancer/job-requests/${job.id}/complete`, {
                                      method: 'POST'
                                    });
                                    
                                    console.log("Job completion response:", response);
                                    
                                    // Get streak info from response
                                    const streak = response.streak || 0;
                                    const performanceBoost = response.performanceBoost || '+15%';
                                    
                                    // Handle already completed job
                                    if (response.alreadyCompleted) {
                                      toast({
                                        title: "Job already completed",
                                        description: "This job was already marked as completed.",
                                      });
                                    } else {
                                      // Show success toast with streak info
                                      toast({
                                        title: "Job marked as completed",
                                        description: `Great work! Your match score has been increased by ${performanceBoost}. Current streak: ${streak} ${streak > 1 ? 'jobs' : 'job'}.`,
                                      });
                                    }
                                    
                                    // Refresh data with forced refetch to ensure we get latest metrics
                                    await Promise.all([
                                      queryClient.invalidateQueries({ queryKey: ['/api/freelancer/job-requests'] }),
                                      queryClient.invalidateQueries({ queryKey: ['/api/freelancer/dashboard'] })
                                    ]);
                                    
                                    // Force immediate refetch of dashboard data to update metrics
                                    refetchDashboard();
                                  } catch (error) {
                                    console.error("Error completing job:", error);
                                    
                                    // Extract error message if available
                                    let errorMessage = "There was a problem completing this job. Please try again.";
                                    if (error && typeof error === 'object' && 'message' in error) {
                                      errorMessage = String(error.message);
                                    }
                                    
                                    toast({
                                      title: "Error completing job",
                                      description: errorMessage,
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                Mark Complete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Confirmation dialog for completing/quitting jobs */}
          <AlertDialog 
            open={!!confirmJobAction} 
            onOpenChange={(open) => !open && setConfirmJobAction(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {confirmJobAction?.action === 'complete' 
                    ? 'Complete this job?' 
                    : 'Quit this job?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {confirmJobAction?.action === 'complete'
                    ? 'Marking a job as complete will increase your match score and add it to your completed jobs count.'
                    : 'Warning: Quitting a job will negatively impact your match score. This cannot be undone.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button
                  onClick={() => {
                    if (confirmJobAction?.action === 'complete') {
                      handleCompleteJob(confirmJobAction.id);
                    } else if (confirmJobAction) {
                      handleQuitJob(confirmJobAction.id);
                    }
                    setConfirmJobAction(null);
                  }}
                  variant={confirmJobAction?.action === 'complete' ? 'default' : 'destructive'}
                >
                  {confirmJobAction?.action === 'complete' ? 'Complete Job' : 'Quit Job'}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>
        
        <TabsContent value="messages" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Messages</CardTitle>
              <CardDescription>
                Your conversations with clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chatsLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : chats.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Messages Yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    When clients message you, the conversations will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {chats.map((chat) => {
                    // Determine the last message for preview and date
                    const lastMessageDate = chat.updated_at || chat.createdAt;
                    const messagePreview = chat.latestMessage?.content || "No messages yet";
                    
                    // Get client initials for avatar
                    const clientName = chat.client?.displayName || chat.client?.username || chat.clientName || "Client";
                    const clientInitial = clientName ? clientName.charAt(0).toUpperCase() : "C";
                    
                    return (
                      <Card key={chat.id} className="overflow-hidden">
                        <div className="p-4">
                          <div className="flex gap-4">
                            <Avatar className="h-10 w-10">
                              {chat.client?.photoURL ? (
                                <AvatarImage src={chat.client.photoURL} alt={clientName} />
                              ) : (
                                <AvatarFallback>{clientInitial}</AvatarFallback>
                              )}
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between">
                                <p className="font-medium">
                                  {chat.client?.displayName || chat.client?.username || chat.clientName || "Client"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(lastMessageDate).toLocaleDateString()}
                                </p>
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {messagePreview}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex justify-end gap-2 mt-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteChat(chat.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => setLocation(`/chat/${chat.id}`)}
                            >
                              Open Chat
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Delete chat confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setChatToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteChat}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <span className="mr-2">Deleting...</span>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}