import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, MapPin, DollarSign, Calendar, Search, Filter, ArrowUpDown, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

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

export default function ExploreFreelancers() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'hourlyRate' | 'availability'>('rating');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Helper function to convert availability status to a numeric value for sorting
  const getAvailabilityValue = (freelancer: Freelancer): number => {
    // Higher values = more available
    if (freelancer.availabilityDetails?.status === 'available') return 100;
    if (freelancer.availabilityDetails?.status === 'limited') return 50;
    if (freelancer.availabilityDetails?.status === 'unavailable') return 0;
    
    // Fall back to the boolean availability flag if no detailed status
    return freelancer.availability === false ? 0 : 100;
  };
  
  // Fetch freelancers data
  const { data: freelancers, isLoading, error } = useQuery({
    queryKey: ['/api/freelancers'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/freelancers');
        if (!response.ok) {
          throw new Error('Failed to fetch freelancers');
        }
        return await response.json() as Freelancer[];
      } catch (err) {
        console.error('Error fetching freelancers:', err);
        throw err;
      }
    }
  });
  
  // Filter and sort freelancers
  const filteredFreelancers = React.useMemo(() => {
    if (!freelancers) return [];
    
    let result = [...freelancers];
    
    // Apply search filter if search term exists
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(
        freelancer => 
          freelancer.displayName.toLowerCase().includes(lowerSearchTerm) ||
          freelancer.profession.toLowerCase().includes(lowerSearchTerm) ||
          freelancer.location.toLowerCase().includes(lowerSearchTerm) ||
          freelancer.skills.some(skill => skill.toLowerCase().includes(lowerSearchTerm))
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'rating') {
        comparison = a.rating - b.rating;
      } else if (sortBy === 'hourlyRate') {
        comparison = a.hourlyRate - b.hourlyRate;
      } else if (sortBy === 'availability') {
        // Sort by availability status
        const availabilityValueA = getAvailabilityValue(a);
        const availabilityValueB = getAvailabilityValue(b);
        comparison = availabilityValueA - availabilityValueB;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    return result;
  }, [freelancers, searchTerm, sortBy, sortOrder]);
  
  // Handle view profile click
  const handleViewProfile = (id: number) => {
    setLocation(`/freelancer/${id}`);
  };
  
  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };
  
  // Change sort field
  const changeSortField = (field: 'rating' | 'hourlyRate' | 'availability') => {
    if (sortBy === field) {
      toggleSortOrder();
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center p-8 bg-red-50 rounded-lg">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Error Loading Freelancers</h2>
          <p className="text-red-600">We encountered an error while loading the freelancer data. Please try again later.</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }
  
  // Render freelancer card
  const renderFreelancerCard = (freelancer: Freelancer) => (
    <Card key={freelancer.id} className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{freelancer.displayName}</CardTitle>
            <CardDescription className="text-primary font-medium">{freelancer.profession}</CardDescription>
          </div>
          <div className="flex items-center">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
            <span>{(freelancer.rating / 10).toFixed(1)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex items-center mb-3 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mr-1" />
          <span>{freelancer.location}</span>
        </div>
        <div className="flex items-center mb-3 text-sm text-muted-foreground">
          <DollarSign className="h-4 w-4 mr-1" />
          <span>${freelancer.hourlyRate}/hr</span>
        </div>
        <div className="flex items-center mb-3 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 mr-1" />
          <span>{freelancer.yearsOfExperience} years experience</span>
        </div>
        
        {/* Availability Status */}
        <div className="flex items-center mb-3">
          {(() => {
            // Check for availabilityDetails first
            if (freelancer.availabilityDetails?.status) {
              const status = freelancer.availabilityDetails.status;
              
              if (status === 'available') {
                return (
                  <div className="flex items-center gap-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Available</span>
                  </div>
                );
              } else if (status === 'limited') {
                return (
                  <div className="flex items-center gap-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded-full">
                    <AlertCircle className="h-3 w-3" />
                    <span>Limited Availability</span>
                  </div>
                );
              } else if (status === 'unavailable') {
                return (
                  <div className="flex items-center gap-1 text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded-full">
                    <XCircle className="h-3 w-3" />
                    <span>Unavailable</span>
                  </div>
                );
              }
            }
            
            // Fall back to boolean availability
            return freelancer.availability !== false ? (
              <div className="flex items-center gap-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full">
                <CheckCircle2 className="h-3 w-3" />
                <span>Available</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded-full">
                <XCircle className="h-3 w-3" />
                <span>Unavailable</span>
              </div>
            );
          })()}
        </div>
        
        <p className="text-sm line-clamp-3 mb-3">
          {freelancer.bio || "No bio available"}
        </p>
        <div className="flex flex-wrap gap-1 mt-2">
          {freelancer.skills.slice(0, 3).map((skill, idx) => (
            <Badge key={idx} variant="outline" className="bg-primary/10">
              {skill}
            </Badge>
          ))}
          {freelancer.skills.length > 3 && (
            <Badge variant="outline" className="bg-muted">
              +{freelancer.skills.length - 3} more
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button 
          onClick={() => handleViewProfile(freelancer.id)} 
          className="w-full"
        >
          View Profile
        </Button>
      </CardFooter>
    </Card>
  );
  
  // Render loading skeleton
  const renderSkeleton = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <Card key={i} className="h-full">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-1/3 mb-3" />
            <Skeleton className="h-4 w-1/4 mb-3" />
            <Skeleton className="h-4 w-2/5 mb-3" />
            <Skeleton className="h-16 w-full mb-3" />
            <div className="flex gap-1">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-full" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Explore Freelancers</h1>
        <p className="text-muted-foreground mb-3">Find the perfect talent for your projects from our community of skilled freelancers</p>
        
        {/* Availability Legend */}
        <div className="flex flex-wrap items-center gap-2 text-sm p-3 bg-muted/20 rounded-md border border-border/40">
          <span className="font-medium">Availability status:</span>
          <div className="flex items-center gap-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="h-3 w-3" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">
            <AlertCircle className="h-3 w-3" />
            <span>Limited Availability</span>
          </div>
          <div className="flex items-center gap-1 text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full">
            <XCircle className="h-3 w-3" />
            <span>Unavailable</span>
          </div>
        </div>
      </div>
      
      {/* Search and filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, skills, location..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => changeSortField('rating')}
            className={sortBy === 'rating' ? 'border-primary' : ''}
          >
            <Star className="h-4 w-4 mr-2" />
            Rating
            {sortBy === 'rating' && (
              <ArrowUpDown className="h-4 w-4 ml-1" />
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => changeSortField('hourlyRate')}
            className={sortBy === 'hourlyRate' ? 'border-primary' : ''}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Rate
            {sortBy === 'hourlyRate' && (
              <ArrowUpDown className="h-4 w-4 ml-1" />
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => changeSortField('availability')}
            className={sortBy === 'availability' ? 'border-primary' : ''}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Availability
            {sortBy === 'availability' && (
              <ArrowUpDown className="h-4 w-4 ml-1" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Freelancer grid */}
      {isLoading ? (
        renderSkeleton()
      ) : freelancers && freelancers.length > 0 ? (
        <>
          {filteredFreelancers.length === 0 ? (
            <div className="text-center p-8 bg-muted/20 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">No freelancers found</h2>
              <p className="text-muted-foreground">Try adjusting your search terms or filters</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredFreelancers.map(renderFreelancerCard)}
            </div>
          )}
        </>
      ) : (
        <div className="text-center p-8 bg-muted/20 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">No freelancers available</h2>
          <p className="text-muted-foreground">Check back later for new talent joining our platform</p>
        </div>
      )}
    </div>
  );
}