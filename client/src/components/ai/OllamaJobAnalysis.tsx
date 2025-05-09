import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { analyzeJobRequestWithOllama, checkOllamaStatus } from '@/lib/ollama-service';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { InfoIcon, Loader2, Star, Award, Clock, Check, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AIMatchResult } from '@shared/ai-schemas';
import { useQuery } from '@tanstack/react-query';

export function OllamaJobAnalysis() {
  const [jobDescription, setJobDescription] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [currentSkill, setCurrentSkill] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AIMatchResult | null>(null);
  const { toast } = useToast();

  // Check if AI service is available
  const { data: aiStatus } = useQuery({
    queryKey: ['ollamaStatus'],
    queryFn: checkOllamaStatus,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const isAIAvailable = !!aiStatus;

  const handleAddSkill = () => {
    if (currentSkill.trim() && !skills.includes(currentSkill.trim())) {
      setSkills([...skills, currentSkill.trim()]);
      setCurrentSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const handleAnalyze = async () => {
    if (!jobDescription.trim() || !isAIAvailable) return;

    setIsAnalyzing(true);
    
    try {
      const result = await analyzeJobRequestWithOllama(jobDescription, skills);
      setResult(result);
    } catch (error: any) {
      console.error('Error analyzing job request:', error);
      toast({
        title: 'Analysis Failed',
        description: error.message || 'Failed to analyze job request',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {!isAIAvailable && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Ollama is not available</AlertTitle>
          <AlertDescription>
            The Ollama service is currently unavailable. Please make sure Ollama is running on your computer.
            Visit <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="underline">ollama.ai</a> to download and install.
          </AlertDescription>
        </Alert>
      )}

      <Card className="p-6 shadow-md">
        <h2 className="text-xl font-bold mb-4">Job Request Details</h2>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="job-description">Job Description</Label>
            <Textarea
              id="job-description"
              placeholder="Describe the job in detail. What are you looking to accomplish? What skills are required? What is the scope of the project?"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={5}
              className="mt-1"
              disabled={!isAIAvailable || isAnalyzing}
            />
          </div>
          
          <div>
            <Label htmlFor="skills">Required Skills</Label>
            <div className="flex mt-1">
              <Input
                id="skills"
                placeholder="Add skills (e.g. JavaScript, Graphic Design)"
                value={currentSkill}
                onChange={(e) => setCurrentSkill(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
                disabled={!isAIAvailable || isAnalyzing}
              />
              <Button 
                onClick={handleAddSkill} 
                className="ml-2"
                disabled={!currentSkill.trim() || !isAIAvailable || isAnalyzing}
              >
                Add
              </Button>
            </div>
            
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {skills.map(skill => (
                  <Badge key={skill} variant="secondary" className="px-2 py-1">
                    {skill}
                    <button
                      onClick={() => handleRemoveSkill(skill)}
                      className="ml-2 text-muted-foreground hover:text-foreground"
                      disabled={isAnalyzing}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          <Button 
            onClick={handleAnalyze} 
            className="w-full"
            disabled={!jobDescription.trim() || !isAIAvailable || isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Find Matching Freelancers'
            )}
          </Button>
        </div>
      </Card>
      
      {result && (
        <Card className="p-6 shadow-md">
          <h2 className="text-xl font-bold mb-4">Job Analysis Results</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Job Analysis</h3>
              <p className="text-muted-foreground mt-1">{result.jobAnalysis.analysisText || "Analysis not available"}</p>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-medium mb-3">Top Matching Freelancers</h3>
              
              {result.matches.length > 0 ? (
                <div className="space-y-4">
                  {result.matches.map((match, index) => (
                    <Card key={match.freelancerId} className={`p-4 relative overflow-hidden ${index === 0 ? 'border-2 border-primary' : ''}`}>
                      {index === 0 && (
                        <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-2 py-1 text-xs font-bold">
                          TOP MATCH
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-md font-bold">Freelancer #{match.freelancerId}</h4>
                          <div className="flex items-center mt-1">
                            <Star className="h-4 w-4 text-amber-500 mr-1" />
                            <span className="text-sm font-medium">{(match.score * 100).toFixed(0)}% Match</span>
                          </div>
                        </div>
                        
                        <div className="flex space-x-3 text-sm">
                          <div className="flex flex-col items-center">
                            <Award className="h-4 w-4 text-blue-500" />
                            <span>{(match.jobPerformanceScore * 100).toFixed(0)}%</span>
                            <span className="text-xs text-muted-foreground">Performance</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <Check className="h-4 w-4 text-green-500" />
                            <span>{(match.skillsScore * 100).toFixed(0)}%</span>
                            <span className="text-xs text-muted-foreground">Skills</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <Clock className="h-4 w-4 text-orange-500" />
                            <span>{(match.responsivenessScore * 100).toFixed(0)}%</span>
                            <span className="text-xs text-muted-foreground">Response</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h5 className="text-sm font-medium mb-1">Match Reasons:</h5>
                        <ScrollArea className="h-28 rounded-md border p-2">
                          <ul className="space-y-1">
                            {match.matchReasons.map((reason, i) => (
                              <li key={i} className="text-sm">• {reason}</li>
                            ))}
                          </ul>
                        </ScrollArea>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Alert variant="default" className="mt-2">
                  <InfoIcon className="h-4 w-4" />
                  <AlertTitle>No matches found</AlertTitle>
                  <AlertDescription>
                    No freelancers matched your job requirements. Try broadening your job description or modifying the required skills.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            {result.suggestedQuestions && result.suggestedQuestions.length > 0 && (
              <>
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Suggested Questions</h3>
                  <ul className="space-y-2">
                    {result.suggestedQuestions.map((question, index) => (
                      <li key={index} className="text-sm bg-muted p-2 rounded">
                        {question}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}