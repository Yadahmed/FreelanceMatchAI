import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { analyzeJobRequest, checkAIStatus } from '@/lib/ai-service';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar } from '@/components/ui/avatar';
import { Loader2, Briefcase, Zap, Clock, Award, AlertCircle } from 'lucide-react';
import { AIMatchResult, FreelancerMatch } from '@shared/ai-schemas';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FreelancerData {
  id: number;
  name: string;
  profession: string;
  imageUrl?: string;
  hourlyRate: number;
}

// Mock function to get freelancer data by ID - in a real app, you'd use a query
const getFreelancerById = async (id: number): Promise<FreelancerData> => {
  // This would fetch from the backend in a real implementation
  return {
    id,
    name: `Freelancer #${id}`,
    profession: 'Professional',
    hourlyRate: 50,
  };
};

// Define the AIStatusResponse interface
interface AIStatusResponse {
  available: boolean;
  services?: {
    deepseek: boolean;
    original: boolean;
  };
}

export function JobAnalysis() {
  const [jobDescription, setJobDescription] = useState('');
  const [skills, setSkills] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIMatchResult | null>(null);
  const [freelancerData, setFreelancerData] = useState<Map<number, FreelancerData>>(new Map());
  const [isAIAvailable, setIsAIAvailable] = useState<boolean | null>(null);
  const { toast } = useToast();
  
  // Check if AI service is available on mount
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        // Get detailed status information
        const statusResponse = await checkAIStatus(true) as AIStatusResponse;
        setIsAIAvailable(statusResponse.available);
        
        if (!statusResponse.available) {
          toast({
            title: 'AI Service Unavailable',
            description: 'The DeepSeek R1 API service is currently unavailable. Analysis functions may not work properly.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error checking AI status:', error);
        setIsAIAvailable(false);
      }
    };
    
    checkAvailability();
  }, [toast]);
  
  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      toast({
        title: 'Job description required',
        description: 'Please provide a job description to analyze.',
        variant: 'destructive',
      });
      return;
    }
    
    // Check if AI service is available before proceeding
    if (isAIAvailable === false) {
      toast({
        title: 'AI Service Unavailable',
        description: 'The DeepSeek R1 API service is currently unavailable. Please try again later.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Convert comma-separated skills to array
      const skillsArray = skills
        .split(',')
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0);
      
      // Send analysis request
      const result = await analyzeJobRequest(jobDescription, skillsArray);
      setAnalysisResult(result);
      
      // Fetch freelancer data for matches
      const freelancers = new Map<number, FreelancerData>();
      for (const match of result.matches) {
        const freelancer = await getFreelancerById(match.freelancerId);
        freelancers.set(match.freelancerId, freelancer);
      }
      setFreelancerData(freelancers);
      
    } catch (error: any) {
      console.error('Error analyzing job request:', error);
      toast({
        title: 'Analysis failed',
        description: error.message || 'Failed to analyze job request',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderMatchCard = (match: FreelancerMatch) => {
    const freelancer = freelancerData.get(match.freelancerId);
    if (!freelancer) return null;
    
    return (
      <Card key={match.freelancerId} className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12 bg-primary">
              {freelancer.imageUrl ? (
                <img src={freelancer.imageUrl} alt={freelancer.name} />
              ) : (
                <span className="text-lg font-bold">{freelancer.name.charAt(0)}</span>
              )}
            </Avatar>
            <div>
              <CardTitle className="text-lg">{freelancer.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{freelancer.profession}</p>
              <p className="text-sm font-semibold">${freelancer.hourlyRate}/hr</p>
            </div>
            <div className="ml-auto">
              <Badge variant="outline" className="bg-primary/10">
                Match Score: {match.score.toFixed(1)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center">
                  <Briefcase className="w-4 h-4 mr-1" />
                  Job Performance
                </span>
                <span>{match.jobPerformanceScore.toFixed(1)}/10</span>
              </div>
              <Progress value={match.jobPerformanceScore * 10} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center">
                  <Zap className="w-4 h-4 mr-1" />
                  Skills Match
                </span>
                <span>{match.skillsScore.toFixed(1)}/10</span>
              </div>
              <Progress value={match.skillsScore * 10} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Responsiveness
                </span>
                <span>{match.responsivenessScore.toFixed(1)}/10</span>
              </div>
              <Progress value={match.responsivenessScore * 10} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center">
                  <Award className="w-4 h-4 mr-1" />
                  Fairness Boost
                </span>
                <span>{match.fairnessScore.toFixed(1)}/10</span>
              </div>
              <Progress value={match.fairnessScore * 10} className="h-2" />
            </div>
          </div>
          
          {match.matchReasons.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Why this freelancer?</h4>
              <ul className="text-sm space-y-1 list-disc pl-5">
                {match.matchReasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
        
        <CardFooter>
          <Button variant="outline" className="w-full">
            Contact Freelancer
          </Button>
        </CardFooter>
      </Card>
    );
  };
  
  return (
    <div className="space-y-6">
      {isAIAvailable === false && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>
            The DeepSeek R1 API service is currently unavailable. Job analysis features may not work properly.
          </AlertDescription>
        </Alert>
      )}
      
      {isAIAvailable === null && (
        <div className="flex items-center justify-center p-4 mb-4 bg-muted/50 rounded-md">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
          <p className="text-sm text-muted-foreground">Checking AI service availability...</p>
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>AI Job Analysis</CardTitle>
          <p className="text-sm text-muted-foreground">
            Describe your project and our AI will find the best freelancers for you.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="jobDescription">Job Description</Label>
            <Textarea
              id="jobDescription"
              placeholder="Describe your project in detail..."
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="skills">Skills Required (comma-separated)</Label>
            <Input
              id="skills"
              placeholder="e.g. React, TypeScript, UI/UX"
              value={skills}
              onChange={e => setSkills(e.target.value)}
            />
          </div>
        </CardContent>
        
        <CardFooter>
          <Button
            onClick={handleAnalyze}
            disabled={isLoading || !jobDescription.trim() || isAIAvailable === false}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Find Matching Freelancers'
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {analysisResult && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Analysis Results</h2>
          
          {analysisResult.jobAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle>Job Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <p><strong>Complexity:</strong> {analysisResult.jobAnalysis.complexity || 'Not specified'}</p>
                  <p><strong>Estimated Duration:</strong> {analysisResult.jobAnalysis.estimatedDuration || 'Not specified'}</p>
                  <p><strong>Budget Range:</strong> {analysisResult.jobAnalysis.budget || 'Not specified'}</p>
                  <p><strong>Skills Required:</strong> {analysisResult.jobAnalysis.extractedSkills?.join(', ') || 'Not specified'}</p>
                </div>
              </CardContent>
            </Card>
          )}
          
          <h3 className="text-xl font-semibold">Top Matches</h3>
          {analysisResult.matches.length > 0 ? (
            <div>
              {analysisResult.matches.map(match => renderMatchCard(match))}
            </div>
          ) : (
            <p>No matches found. Try broadening your job description or skills.</p>
          )}
          
          {analysisResult.suggestedQuestions && analysisResult.suggestedQuestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Suggested Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-2">
                  {analysisResult.suggestedQuestions.map((question, index) => (
                    <li key={index}>{question}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}