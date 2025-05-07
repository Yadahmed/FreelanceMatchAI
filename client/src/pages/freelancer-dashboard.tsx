import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ChevronRightIcon, LineChartIcon, MessageSquareIcon, ClockIcon, BriefcaseIcon, StarIcon, DollarSignIcon } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function FreelancerDashboard() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const [selectedTab, setSelectedTab] = useState<string>("overview");
  
  // Fetch freelancer dashboard data
  const { 
    data: dashboardData, 
    isLoading: dashboardLoading,
    error: dashboardError
  } = useQuery({
    queryKey: ['/api/freelancer/dashboard'],
    enabled: !!currentUser && !currentUser.isClient
  });
  
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

  const isLoading = authLoading || dashboardLoading || jobRequestsLoading || notificationsLoading;
  const hasError = dashboardError || jobRequestsError || notificationsError;

  // Placeholder data for development
  // Default values with type safety
  const statsData = {
    earnings: {
      total: dashboardData?.earnings?.total || 0,
      thisMonth: dashboardData?.earnings?.thisMonth || 0,
      change: dashboardData?.earnings?.change || 0
    },
    completedJobs: dashboardData?.completedJobs || 0,
    totalHours: dashboardData?.totalHours || 0,
    rating: dashboardData?.rating || 4.5,
    matchScore: dashboardData?.matchScore || 85
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
                <div className="text-2xl font-bold">{statsData.rating}</div>
                <div className="flex mt-1">
                  {Array(5).fill(0).map((_, i) => (
                    <StarIcon 
                      key={i} 
                      className={`h-3 w-3 ${i < Math.floor(statsData.rating) ? 'text-yellow-500' : 'text-muted-foreground'}`} 
                      fill={i < Math.floor(statsData.rating) ? 'currentColor' : 'none'} 
                    />
                  ))}
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
              ) : jobRequests && jobRequests.length > 0 ? (
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
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <MessageSquareIcon className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Messages Yet</h3>
                <p className="text-muted-foreground max-w-md">
                  You don't have any message threads at the moment. When clients contact you, conversations will appear here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}