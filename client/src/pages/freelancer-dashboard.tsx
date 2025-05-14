import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ChevronRightIcon, LineChartIcon, MessageSquareIcon, ClockIcon, BriefcaseIcon, StarIcon, DollarSignIcon } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Rating } from '@/components/ui/rating';

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
  availability?: string;
  matchScore?: number;
  jobPerformance?: number;
  skillsExperience?: number;
  responsiveness?: number;
  fairnessScore?: number;
}

interface FreelancerStats {
  completedJobsCount: number;
  averageRating: number | null;
  totalEarnings: number;
  totalHoursWorked: number;
}

interface DashboardData {
  freelancer: FreelancerProfile;
  stats: FreelancerStats;
  earnings?: {
    total: number;
    thisMonth: number;
    change: number;
  };
  totalHours?: number;
  matchScore?: number;
}

export default function FreelancerDashboard() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedTab, setSelectedTab] = useState<string>("overview");
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
  
  // Refetch dashboard data periodically to get updated rating
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
    queryFn: async () => {
      const response = await fetch('/api/freelancer/chats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }
      
      const data = await response.json();
      return data.chats || [];
    },
    enabled: !!currentUser && !currentUser.isClient
  });

  const isLoading = authLoading || dashboardLoading || jobRequestsLoading || notificationsLoading || chatsLoading;
  const hasError = dashboardError || jobRequestsError || notificationsError || chatsError;

  // Dashboard data type definition
  interface DashboardData {
    earnings?: {
      total: number;
      thisMonth: number;
      change: number;
    };
    completedJobs?: number;
    totalHours?: number;
    rating?: number | null;
    matchScore?: number;
  }
  
  // Typed dashboard data
  const typedDashboardData = dashboardData as DashboardData || {};
  
  // Debug rating information
  console.log("Freelancer Dashboard Data:", dashboardData);
  console.log("Freelancer Rating:", dashboardData?.freelancer?.rating);
  console.log("Stats Rating:", dashboardData?.stats?.averageRating);
  
  // Default values with type safety
  const statsData = {
    earnings: {
      total: typedDashboardData?.earnings?.total || 0,
      thisMonth: typedDashboardData?.earnings?.thisMonth || 0,
      change: typedDashboardData?.earnings?.change || 0
    },
    completedJobs: dashboardData?.stats?.completedJobsCount || dashboardData?.freelancer?.completedJobs || 0,
    totalHours: typedDashboardData?.totalHours || 0,
    rating: dashboardData?.stats?.averageRating !== undefined ? dashboardData.stats.averageRating : 
            dashboardData?.freelancer?.rating !== undefined ? dashboardData.freelancer.rating : null,
    matchScore: typedDashboardData?.matchScore || 85
  };

  // Parse any responses to ensure type safety
  const recentJobRequests = Array.isArray(jobRequests) ? jobRequests.slice(0, 3) : [];
  const recentNotifications = Array.isArray(notifications) ? notifications.slice(0, 5) : [];
  
  if (authLoading) {
    return <div className="flex items-center justify-center h-screen">Loading authentication data...</div>;
  }
  
  if (currentUser?.isClient) {
    // Redirect client users
    window.location.href = '/client/dashboard';
    return null;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Freelancer Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {currentUser?.displayName || 'Freelancer'}
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button variant="default">Update Availability</Button>
        </div>
      </div>
      
      <Tabs defaultValue="overview" value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="jobs">Job Requests</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Earnings
                </CardTitle>
                <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${statsData.earnings.total}</div>
                <p className="text-xs text-muted-foreground">
                  +${statsData.earnings.thisMonth} this month
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Completed Jobs
                </CardTitle>
                <BriefcaseIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsData.completedJobs}</div>
                <p className="text-xs text-muted-foreground">
                  {statsData.totalHours} total hours
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Rating
                </CardTitle>
                <StarIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsData.rating !== null ? statsData.rating.toFixed(1) : 'Not rated'}</div>
                <div className="mt-1">
                  <Rating value={statsData.rating} size="sm" showNoRating={true} />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Match Score
                </CardTitle>
                <LineChartIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsData.matchScore}%</div>
                <Progress value={statsData.matchScore} className="h-2" />
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-1 md:col-span-2 lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Job Requests</CardTitle>
                <CardDescription>
                  You have {recentJobRequests.length || 0} new job requests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <p>Loading job requests...</p>
                ) : recentJobRequests.length > 0 ? (
                  recentJobRequests.map((job: any) => (
                    <div key={job.id} className="flex items-center gap-4 border-b pb-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={job?.client?.photoURL || undefined} />
                        <AvatarFallback>{job?.client?.displayName?.substring(0, 2) || 'CL'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium leading-none">{job.title || 'Untitled Job'}</p>
                          <Badge variant={
                            job.status === 'pending' ? 'outline' : 
                            job.status === 'accepted' ? 'secondary' : 
                            job.status === 'declined' ? 'destructive' : 'default'
                          }>
                            {job.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {job.description?.substring(0, 100) || 'No description'}...
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ClockIcon className="h-3 w-3" />
                          <span>
                            {new Date(job.createdAt).toLocaleDateString()}
                          </span>
                          <DollarSignIcon className="h-3 w-3 ml-2" />
                          <span>${job.budget || 'Not specified'}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No job requests yet</p>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => setSelectedTab("jobs")}>
                  View All Job Requests
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Notifications</CardTitle>
                <CardDescription>
                  Stay updated with latest activities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <p>Loading notifications...</p>
                ) : recentNotifications.length > 0 ? (
                  recentNotifications.map((notification: any) => (
                    <div key={notification.id} className="flex gap-4 items-start border-b pb-3">
                      <div className={`p-2 rounded-full bg-primary/10 text-primary`}>
                        {notification.type === 'message' ? (
                          <MessageSquareIcon className="h-4 w-4" />
                        ) : notification.type === 'job' ? (
                          <BriefcaseIcon className="h-4 w-4" />
                        ) : (
                          <StarIcon className="h-4 w-4" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm">{notification.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No notifications</p>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  View All Notifications
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Requests</CardTitle>
              <CardDescription>
                Manage all your job requests and proposals
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Loading job requests...</p>
              ) : jobRequests && Array.isArray(jobRequests) && jobRequests.length > 0 ? (
                <div className="space-y-6">
                  {jobRequests.map((job: any) => (
                    <div key={job.id} className="flex flex-col md:flex-row gap-4 border-b pb-6">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={job?.client?.photoURL || undefined} />
                        <AvatarFallback>{job?.client?.displayName?.substring(0, 2) || 'CL'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <div>
                            <h4 className="text-base font-semibold">{job.title || 'Untitled Job'}</h4>
                            <p className="text-sm text-muted-foreground">
                              From: {job?.client?.displayName || 'Client'} • {new Date(job.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={
                            job.status === 'pending' ? 'outline' : 
                            job.status === 'accepted' ? 'secondary' : 
                            job.status === 'declined' ? 'destructive' : 'default'
                          } className="md:self-start">
                            {job.status}
                          </Badge>
                        </div>
                        <p className="text-sm">
                          {job.description || 'No description provided'}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {job.skills?.map((skill: string, i: number) => (
                            <Badge key={i} variant="secondary">{skill}</Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
                            <span>Budget: ${job.budget || 'Not specified'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ClockIcon className="h-4 w-4 text-muted-foreground" />
                            <span>Duration: {job.duration || 'Not specified'}</span>
                          </div>
                        </div>
                        {job.status === 'pending' && (
                          <div className="flex gap-2 mt-2">
                            <Button 
                              size="sm"
                              onClick={() => {
                                // Handle job acceptance
                                apiRequest(`/api/freelancer/job-requests/${job.id}`, {
                                  method: 'PATCH',
                                  body: JSON.stringify({ status: 'accepted' })
                                });
                              }}
                            >
                              Accept
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                // Handle job decline
                                apiRequest(`/api/freelancer/job-requests/${job.id}`, {
                                  method: 'PATCH',
                                  body: JSON.stringify({ status: 'declined' })
                                });
                              }}
                            >
                              Decline
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <BriefcaseIcon className="h-10 w-10 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Job Requests Yet</h3>
                  <p className="text-muted-foreground max-w-md">
                    You don't have any job requests at the moment. Update your profile to increase visibility to potential clients.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="bookings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Bookings</CardTitle>
              <CardDescription>
                Manage your scheduled client appointments and sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ClockIcon className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Bookings Yet</h3>
                <p className="text-muted-foreground max-w-md">
                  You don't have any bookings at the moment. Bookings will appear here once clients schedule time with you.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
              <CardDescription>
                Manage your conversations with clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-4">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : chats && Array.isArray(chats) && chats.length > 0 ? (
                <div className="space-y-4">
                  {chats.map((chat: any) => (
                    <div 
                      key={chat.id} 
                      className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        // Get the client ID from the chat and use messages route if available
                        const clientId = chat.relatedJobRequest?.client?.id;
                        if (clientId) {
                          setLocation(`/messages/${clientId}`);
                        } else {
                          setLocation(`/chat/${chat.id}`);
                        }
                      }}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {chat.relatedJobRequest?.client?.displayName?.substring(0, 2) || 'CL'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-medium truncate">
                            {chat.relatedJobRequest?.client?.displayName || 'Client'}
                          </p>
                          <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {chat.latestMessage ? new Date(chat.latestMessage.timestamp).toLocaleDateString() : 'No messages'}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {chat.latestMessage?.content || 'No messages yet'}
                        </p>
                      </div>
                      {chat.messageCount > 0 && (
                        <div className="bg-primary text-primary-foreground text-xs rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
                          {chat.messageCount}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <MessageSquareIcon className="h-10 w-10 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Messages Yet</h3>
                  <p className="text-muted-foreground max-w-md">
                    You don't have any message threads at the moment. When clients contact you, conversations will appear here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}