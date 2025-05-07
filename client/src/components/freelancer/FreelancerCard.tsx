import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Briefcase, MapPin, Award, Clock, Star, User } from 'lucide-react';

interface FreelancerCardProps {
  freelancer: {
    id: number;
    userId: number;
    profession: string;
    skills: string[];
    bio: string;
    hourlyRate: number;
    location: string;
    rating: number;
    jobPerformance: number;
    skillsExperience: number;
    responsiveness: number;
    fairnessScore: number;
    yearsOfExperience: number;
    completedJobs: number;
    availability?: boolean;
    imageUrl?: string;
    displayName?: string;
    username?: string;
  };
  showDetails?: boolean;
}

export function FreelancerCard({ freelancer, showDetails = false }: FreelancerCardProps) {
  // Get the display name or username
  const name = freelancer.displayName || freelancer.username || `Freelancer ${freelancer.id}`;
  
  // Format skills to display only first 3
  const displaySkills = freelancer.skills.slice(0, 3);
  const extraSkillsCount = Math.max(0, freelancer.skills.length - 3);
  
  // Calculate the match score (weighted average)
  const matchScore = Math.round(
    (freelancer.jobPerformance * 0.5) + 
    (freelancer.skillsExperience * 0.2) + 
    (freelancer.responsiveness * 0.15) + 
    (freelancer.fairnessScore * 0.15)
  );
  
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
              <AvatarImage src={freelancer.imageUrl} alt={name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg font-semibold">{name}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                <span>{freelancer.profession}</span>
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">${freelancer.hourlyRate}/hr</div>
            <Badge variant={freelancer.availability ? "success" : "secondary"}>
              {freelancer.availability ? "Available" : "Busy"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <MapPin className="h-3.5 w-3.5" />
            <span>{freelancer.location}</span>
            
            <div className="ml-2 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{freelancer.yearsOfExperience} {freelancer.yearsOfExperience === 1 ? 'year' : 'years'} experience</span>
            </div>
            
            <div className="ml-2 flex items-center gap-1">
              <Award className="h-3.5 w-3.5" />
              <span>{freelancer.completedJobs} {freelancer.completedJobs === 1 ? 'job' : 'jobs'} completed</span>
            </div>
          </div>
          
          <div className="line-clamp-2 text-sm text-muted-foreground">
            {freelancer.bio}
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
                  <span>{freelancer.jobPerformance}%</span>
                </div>
                <Progress value={freelancer.jobPerformance} className="h-1.5" />
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>Skills & Experience</span>
                  <span>{freelancer.skillsExperience}%</span>
                </div>
                <Progress value={freelancer.skillsExperience} className="h-1.5" />
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>Responsiveness</span>
                  <span>{freelancer.responsiveness}%</span>
                </div>
                <Progress value={freelancer.responsiveness} className="h-1.5" />
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>Fairness Score</span>
                  <span>{freelancer.fairnessScore}%</span>
                </div>
                <Progress value={freelancer.fairnessScore} className="h-1.5" />
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
                className={`h-4 w-4 ${i < Math.round(freelancer.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
              />
            ))}
          </div>
          <span className="text-sm font-medium">{freelancer.rating.toFixed(1)}</span>
        </div>
        
        <div className="space-x-2">
          <Button variant="outline" asChild>
            <Link href={`/freelancers/${freelancer.id}`}>
              View Profile
            </Link>
          </Button>
          <Button>
            <Link href={`/booking/${freelancer.id}`}>
              Book Now
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}