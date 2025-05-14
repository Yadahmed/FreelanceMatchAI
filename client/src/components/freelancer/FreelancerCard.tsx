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
    <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-300 hover:translate-y-[-2px] group">
      <CardHeader className="p-4 pb-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14 border-2 border-primary/10 transition-all duration-300 group-hover:border-primary/30 shadow-sm">
              <AvatarImage src={imageUrl} alt={name} />
              <AvatarFallback className="bg-primary/5 text-primary font-medium">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg font-display font-semibold group-hover:text-primary transition-colors duration-300">{name}</CardTitle>
              <CardDescription className="flex items-center gap-1 mt-1">
                <Briefcase className="h-3.5 w-3.5 text-primary/70" />
                <span>{profession}</span>
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold font-display">${hourlyRate}<span className="text-sm font-normal text-muted-foreground">/hr</span></div>
            <Badge variant={availability ? "outline" : "secondary"} 
              className={availability 
                ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors duration-300" 
                : "transition-colors duration-300"}>
              {availability ? "Available" : "Busy"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-sm">
            <div className="flex items-center gap-1 transition-colors duration-300 hover:text-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary/70" />
              <span>{location}</span>
            </div>
            
            <div className="flex items-center gap-1 transition-colors duration-300 hover:text-foreground">
              <Clock className="h-3.5 w-3.5 text-primary/70" />
              <span>{yearsOfExperience} {yearsOfExperience === 1 ? 'year' : 'years'} experience</span>
            </div>
            
            <div className="flex items-center gap-1 transition-colors duration-300 hover:text-foreground">
              <Award className="h-3.5 w-3.5 text-primary/70" />
              <span>{completedJobs} {completedJobs === 1 ? 'job' : 'jobs'} completed</span>
            </div>
          </div>
          
          <div className="line-clamp-2 text-sm text-muted-foreground group-hover:text-muted-foreground/90 transition-colors duration-300">
            {bio}
          </div>
          
          <div className="flex flex-wrap gap-1.5">
            {displaySkills.map((skill) => (
              <Badge 
                key={skill} 
                variant="outline" 
                className="font-normal bg-primary/5 hover:bg-primary/10 border-primary/10 transition-all duration-300 hover:border-primary/20"
              >
                {skill}
              </Badge>
            ))}
            {extraSkillsCount > 0 && (
              <Badge 
                variant="outline" 
                className="font-normal bg-muted hover:bg-muted/80 transition-all duration-300"
              >
                +{extraSkillsCount} more
              </Badge>
            )}
          </div>
          
          {showDetails && (
            <div className="mt-3 space-y-4 animate-fade-in">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Job Performance</span>
                  <span className="font-semibold text-primary">{jobPerformance}%</span>
                </div>
                <Progress 
                  value={jobPerformance} 
                  className="h-2 rounded-full overflow-hidden bg-primary/10" 
                  indicatorClassName="bg-gradient-to-r from-primary/80 to-primary transition-all duration-500"
                />
              </div>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Skills & Experience</span>
                  <span className="font-semibold text-primary">{skillsExperience}%</span>
                </div>
                <Progress 
                  value={skillsExperience} 
                  className="h-2 rounded-full overflow-hidden bg-primary/10" 
                  indicatorClassName="bg-gradient-to-r from-primary/80 to-primary transition-all duration-500"
                />
              </div>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Responsiveness</span>
                  <span className="font-semibold text-primary">{responsiveness}%</span>
                </div>
                <Progress 
                  value={responsiveness} 
                  className="h-2 rounded-full overflow-hidden bg-primary/10" 
                  indicatorClassName="bg-gradient-to-r from-primary/80 to-primary transition-all duration-500"
                />
              </div>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Fairness Score</span>
                  <span className="font-semibold text-primary">{fairnessScore}%</span>
                </div>
                <Progress 
                  value={fairnessScore} 
                  className="h-2 rounded-full overflow-hidden bg-primary/10" 
                  indicatorClassName="bg-gradient-to-r from-primary/80 to-primary transition-all duration-500"
                />
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
                className={`h-4 w-4 ${i < Math.round(rating > 5 ? rating / 10 : rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
              />
            ))}
          </div>
          <span className="text-sm font-medium">
            {rating 
              ? (rating > 5 ? (rating / 10).toFixed(1) : rating.toFixed(1))
              : "No ratings"
            }
          </span>
        </div>
        
        <div className="space-x-2">
          {/* Get ID from either possible location */}
          {(() => {
            // Extract ID from either location
            const id = freelancer.id || 
                      freelancer.freelancerId || 
                      (freelancer.freelancer && freelancer.freelancer.id);
            
            if (!id) {
              console.error("Unable to determine freelancer ID:", freelancer);
              return (
                <div className="text-red-500 text-sm">Error: Unable to find freelancer ID</div>
              );
            }
            
            return (
              <>
                <Button variant="outline" size="sm" asChild className="flex items-center gap-1">
                  <Link href={`/freelancer/${id}`}>
                    <User className="h-4 w-4" /> View Profile
                  </Link>
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  asChild 
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Link href={`/messages/${id}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Chat Now
                  </Link>
                </Button>
                <Button 
                  asChild 
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Link href={`/booking/${id}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                      <line x1="16" x2="16" y1="2" y2="6" />
                      <line x1="8" x2="8" y1="2" y2="6" />
                      <line x1="3" x2="21" y1="10" y2="10" />
                      <path d="m9 16 2 2 4-4" />
                    </svg>
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