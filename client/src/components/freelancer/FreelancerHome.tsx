import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/use-auth';
import { ChevronRight, DollarSign, Briefcase, Star, BarChart, FileSearch, Bell } from 'lucide-react';

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
}

interface DashboardData {
  freelancer: FreelancerProfile;
  stats: FreelancerStats;
  jobRequests?: any[];
  bookings?: any[];
  notifications?: any[];
  recentReviews?: any[];
}

export function FreelancerHome() {
  const { currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedTab, setSelectedTab] = useState("overview");
  
  // Fetch freelancer dashboard data
  const { 
    data: dashboardData, 
    isLoading: dashboardLoading,
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
    data: jobRequests
  } = useQuery<any[]>({
    queryKey: ['/api/freelancer/job-requests'],
    enabled: !!currentUser && !currentUser.isClient
  });
  
  // Fetch notifications
  const { 
    data: notifications
  } = useQuery<any[]>({
    queryKey: ['/api/freelancer/notifications'],
    enabled: !!currentUser && !currentUser.isClient
  });
  
  if (dashboardLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 animate-pulse rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-32 bg-gray-200 dark:bg-gray-800 animate-pulse rounded"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-800 animate-pulse rounded"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-800 animate-pulse rounded"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-800 animate-pulse rounded"></div>
        </div>
      </div>
    );
  }
  
  const freelancer = dashboardData?.freelancer;
  const stats = dashboardData?.stats;
  
  // Format stats with defaults
  const totalEarnings = 0;
  const thisMonthEarnings = 0;
  const completedJobs = stats?.completedJobsCount || 0;
  const totalHours = 0;
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
        
        <Button variant="outline" onClick={() => setLocation("/freelancer-availability")}>
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
                    <div className="text-2xl font-bold">{rating ? (rating / 10).toFixed(1) : "0.0"}</div>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-3 w-3 ${i < Math.round(rating / 20) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
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
                    onClick={() => setLocation("/freelancer-dashboard")}
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
                    onClick={() => setLocation("/freelancer-dashboard")}
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
            </CardHeader>
            <CardContent>
              <div className="py-10 text-center">
                <Button onClick={() => setLocation("/freelancer-dashboard")}>
                  View Full Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="bookings" className="py-4">
          <Card>
            <CardHeader>
              <CardTitle>Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="py-10 text-center">
                <Button onClick={() => setLocation("/freelancer-dashboard")}>
                  View Full Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="messages" className="py-4">
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="py-10 text-center">
                <Button onClick={() => setLocation("/messages")}>
                  View Messages
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}