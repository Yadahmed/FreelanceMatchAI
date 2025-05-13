import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Briefcase, MapPin, Award, Clock, Star, User } from 'lucide-react';

interface FreelancerCardProps {
  freelancer: {
    id?: number;
    freelancerId?: number; // Added to support both data formats
    userId?: number;
    profession?: string;
    skills?: string[];
    bio?: string;
    hourlyRate?: number;
    location?: string;
    rating?: number;
    jobPerformance?: number;
    skillsExperience?: number;
    responsiveness?: number;
    fairnessScore?: number;
    yearsOfExperience?: number;
    completedJobs?: number;
    availability?: boolean;
    imageUrl?: string;
    displayName?: string;
    username?: string;
    // Support for nested freelancer object from AI service
    freelancer?: any;
  };
  showDetails?: boolean;
}

export function FreelancerCard({ freelancer, showDetails = false }: FreelancerCardProps) {
  // Ensure freelancer has required fields with defaults if needed
  console.log("FreelancerCard received freelancer:", freelancer);
  
  // Always use the display name to show the real name of the freelancer
  const name = freelancer.displayName || freelancer.username || 'Anonymous Freelancer';
  
  // Handle missing skills to prevent errors
  const skills = Array.isArray(freelancer.skills) ? freelancer.skills : [];
  
  // Format skills to display only first 3
  const displaySkills = skills.slice(0, 3);
  const extraSkillsCount = Math.max(0, skills.length - 3);
  
  // Set default values for all required properties to prevent errors
  const jobPerformance = freelancer.jobPerformance || 0;
  const skillsExperience = freelancer.skillsExperience || 0;
  const responsiveness = freelancer.responsiveness || 0;
  const fairnessScore = freelancer.fairnessScore || 0;
  const location = freelancer.location || 'Unknown location';
  const hourlyRate = freelancer.hourlyRate || 0;
  const yearsOfExperience = freelancer.yearsOfExperience || 0;
  const completedJobs = freelancer.completedJobs || 0;
  const rating = freelancer.rating || 0;
  const bio = freelancer.bio || 'No bio available';
  const profession = freelancer.profession || 'Freelancer';
  const availability = freelancer.availability !== undefined ? freelancer.availability : true;
  
  // Calculate the match score (weighted average)
  const matchScore = Math.round(
    (jobPerformance * 0.5) + 
    (skillsExperience * 0.2) + 
    (responsiveness * 0.15) + 
    (fairnessScore * 0.15)
  );
  
  // Generate avatar initials
  // Set image URL with fallback
  const imageUrl = freelancer.imageUrl || '';
  
  // Generate avatar initials
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
  
  return (
    <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="p-4 pb-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-12 w-12 border">
              <AvatarImage src={imageUrl} alt={name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg font-semibold">{name}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                <span>{profession}</span>
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">${hourlyRate}/hr</div>
            <Badge variant={availability ? "outline" : "secondary"} 
              className={availability ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}>
              {availability ? "Available" : "Busy"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <MapPin className="h-3.5 w-3.5" />
            <span>{location}</span>
            
            <div className="ml-2 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{yearsOfExperience} {yearsOfExperience === 1 ? 'year' : 'years'} experience</span>
            </div>
            
            <div className="ml-2 flex items-center gap-1">
              <Award className="h-3.5 w-3.5" />
              <span>{completedJobs} {completedJobs === 1 ? 'job' : 'jobs'} completed</span>
            </div>
          </div>
          
          <div className="line-clamp-2 text-sm text-muted-foreground">
            {bio}
          </div>
          
          <div className="flex flex-wrap gap-1">
            {displaySkills.map((skill) => (
              <Badge key={skill} variant="outline" className="font-normal">
                {skill}
              </Badge>
            ))}
            {extraSkillsCount > 0 && (
              <Badge variant="outline" className="font-normal">
                +{extraSkillsCount} more
              </Badge>
            )}
          </div>
          
          {showDetails && (
            <div className="mt-2 space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>Job Performance</span>
                  <span>{jobPerformance}%</span>
                </div>
                <Progress value={jobPerformance} className="h-1.5" />
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>Skills & Experience</span>
                  <span>{skillsExperience}%</span>
                </div>
                <Progress value={skillsExperience} className="h-1.5" />
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>Responsiveness</span>
                  <span>{responsiveness}%</span>
                </div>
                <Progress value={responsiveness} className="h-1.5" />
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>Fairness Score</span>
                  <span>{fairnessScore}%</span>
                </div>
                <Progress value={fairnessScore} className="h-1.5" />
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className={`h-4 w-4 ${i < Math.round(rating / 10) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
              />
            ))}
          </div>
          <span className="text-sm font-medium">{rating ? (rating / 10).toFixed(1) : "No ratings"}</span>
        </div>
        
        <div className="space-x-2">
          {/* Get ID from either possible location */}
          {(() => {
            // Extract ID from either location
            const id = freelancer.id || 
                      freelancer.freelancerId || 
                      (freelancer.freelancer && freelancer.freelancer.id);
            
            return (
              <>
                <Button variant="outline" asChild>
                  <Link href={`/freelancers/${id}`}>
                    View Profile
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/messages/${id}`}>
                    Message
                  </Link>
                </Button>
                <Button asChild>
                  <Link href={`/booking/${id}`}>
                    Book Now
                  </Link>
                </Button>
              </>
            );
          })()}
        </div>
      </CardFooter>
    </Card>
  );
}