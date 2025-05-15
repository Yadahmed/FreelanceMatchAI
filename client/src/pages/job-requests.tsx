import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertCircle,
  Briefcase,
  User,
  Star,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  ArrowLeft,
} from 'lucide-react';

// Define types for job requests
interface JobRequest {
  id: number;
  title: string;
  description: string;
  budget: number | null;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  createdAt: string;
  updatedAt: string;
  freelancer: {
    id: number;
    userId: number;
    displayName: string;
    profession: string;
    skills: string[];
    location: string;
    imageUrl?: string | null;
    rating: number;
    availability?: boolean;
    availabilityDetails?: {
      status?: 'available' | 'limited' | 'unavailable';
    };
  };
}

export default function JobRequestsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isAuthenticated, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('all');

  // Fetch job requests
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/client/job-requests'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/client/job-requests');
        if (!response.ok) {
          throw new Error('Failed to fetch job requests');
        }
        const data = await response.json();
        return data.jobRequests as JobRequest[];
      } catch (err) {
        console.error('Error fetching job requests:', err);
        throw err;
      }
    },
    enabled: isAuthenticated && currentUser?.isClient,
  });

  // Filter job requests based on active tab
  const filteredRequests = data?.filter(job => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return job.status === 'pending';
    if (activeTab === 'accepted') return job.status === 'accepted';
    if (activeTab === 'completed') return job.status === 'completed';
    if (activeTab === 'declined') return job.status === 'declined';
    return true;
  });

  const handleGoBack = () => {
    setLocation('/');
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'outline';
      case 'accepted':
        return 'secondary';
      case 'completed':
        return 'default';
      case 'declined':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 mr-1" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 mr-1" />;
      case 'completed':
        return <Star className="h-4 w-4 mr-1" />;
      case 'declined':
        return <XCircle className="h-4 w-4 mr-1" />;
      default:
        return <Clock className="h-4 w-4 mr-1" />;
    }
  };

  // Function to get availability status
  const getAvailabilityStatus = (freelancer: JobRequest['freelancer']) => {
    if (!freelancer.availabilityDetails) return null;
    
    const status = freelancer.availabilityDetails.status || 
                  (freelancer.availability === false ? 'unavailable' : 'available');
    
    switch (status) {
      case 'available':
        return { 
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          text: 'Available',
          color: 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400' 
        };
      case 'limited':
        return {
          icon: <AlertCircle className="h-4 w-4 text-amber-500" />,
          text: 'Limited Availability',
          color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400'
        };
      case 'unavailable':
        return {
          icon: <XCircle className="h-4 w-4 text-red-500" />,
          text: 'Not Available',
          color: 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400'
        };
      default:
        return {
          icon: <Clock className="h-4 w-4 text-gray-500" />,
          text: 'Unknown',
          color: 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400'
        };
    }
  };

  // Check if the client is authenticated
  if (!isAuthenticated || !currentUser?.isClient) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Client Access Required</CardTitle>
            <CardDescription>You need to be logged in as a client to view this page.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => setLocation('/login')}>Log In</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Job Requests</CardTitle>
            <CardDescription>
              We encountered an error while loading your job requests. Please try again later.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <Button variant="outline" size="sm" className="mb-4" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-3xl font-bold">Your Job Requests</h1>
          <p className="text-muted-foreground">
            Track and manage your job requests to freelancers
          </p>
        </div>
        <Button onClick={() => setLocation('/explore-freelancers')} className="gap-2">
          <User className="h-4 w-4" />
          Find Freelancers
        </Button>
      </div>

      <Tabs 
        defaultValue="all" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-5 w-full md:w-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="accepted">Accepted</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="declined">Declined</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-8">
                <div className="flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  <p className="mt-4 text-muted-foreground">Loading your job requests...</p>
                </div>
              </CardContent>
            </Card>
          ) : filteredRequests && filteredRequests.length > 0 ? (
            filteredRequests.map((job) => (
              <Card key={job.id} className="overflow-hidden border-muted">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Freelancer info */}
                    <div className="flex flex-col items-center md:items-start md:w-1/4">
                      <Avatar className="h-20 w-20 mb-3">
                        <AvatarImage src={job.freelancer.imageUrl || undefined} />
                        <AvatarFallback className="text-lg">
                          {job.freelancer.displayName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <h3 className="text-lg font-semibold">{job.freelancer.displayName}</h3>
                      <p className="text-sm text-muted-foreground">{job.freelancer.profession}</p>
                      
                      <div className="flex items-center mt-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-400 mr-1" />
                        <span>{(job.freelancer.rating / 10).toFixed(1)} Rating</span>
                      </div>
                      
                      {job.freelancer.availabilityDetails && (
                        <div className="mt-2">
                          {(() => {
                            const availabilityStatus = getAvailabilityStatus(job.freelancer);
                            if (!availabilityStatus) return null;
                            
                            return (
                              <div className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${availabilityStatus.color}`}>
                                {availabilityStatus.icon}
                                <span>{availabilityStatus.text}</span>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                      
                      <div className="mt-4 flex flex-col gap-2 w-full">
                        <Button variant="outline" size="sm" className="w-full" asChild>
                          <a href={`/freelancer/${job.freelancer.id}`}>
                            <User className="h-4 w-4 mr-2" />
                            View Profile
                          </a>
                        </Button>
                        <Button size="sm" className="w-full" asChild>
                          <a href={`/messages/${job.freelancer.id}`}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Message
                          </a>
                        </Button>
                      </div>
                    </div>
                    
                    {/* Job details */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold">{job.title}</h3>
                        <Badge variant={getBadgeVariant(job.status)} className="flex items-center">
                          {getStatusIcon(job.status)}
                          <span className="capitalize">{job.status}</span>
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 mb-3 text-sm">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-muted-foreground mr-1" />
                          <span>
                            Submitted: {new Date(job.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {job.budget && (
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 text-muted-foreground mr-1" />
                            <span>Budget: ${job.budget}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="bg-muted/30 p-4 rounded-md mb-4 text-sm">
                        <h4 className="font-medium mb-2">Project Description</h4>
                        <p className="whitespace-pre-line">{job.description}</p>
                      </div>
                      
                      {job.status === 'accepted' && (
                        <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-md border border-green-200 dark:border-green-900/30 mb-4">
                          <h4 className="font-medium text-green-800 dark:text-green-400 mb-1">Accepted!</h4>
                          <p className="text-sm text-green-700 dark:text-green-400">
                            This freelancer has accepted your job request. You can now communicate further details via messages.
                          </p>
                        </div>
                      )}
                      
                      {job.status === 'declined' && (
                        <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-md border border-red-200 dark:border-red-900/30 mb-4">
                          <h4 className="font-medium text-red-800 dark:text-red-400 mb-1">Declined</h4>
                          <p className="text-sm text-red-700 dark:text-red-400">
                            This freelancer has declined your job request. You may want to explore other freelancers or modify your project details.
                          </p>
                        </div>
                      )}
                      
                      {job.status === 'completed' && (
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-md border border-blue-200 dark:border-blue-900/30 mb-4">
                          <h4 className="font-medium text-blue-800 dark:text-blue-400 mb-1">Completed</h4>
                          <p className="text-sm text-blue-700 dark:text-blue-400">
                            This job has been marked as completed. We hope you're satisfied with the work!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Job Requests Found</h3>
                  <p className="text-muted-foreground max-w-md mb-6">
                    You haven't sent any job requests to freelancers yet. Browse our freelancer directory to find the perfect match for your project.
                  </p>
                  <Button onClick={() => setLocation('/explore-freelancers')}>
                    Find Freelancers
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}