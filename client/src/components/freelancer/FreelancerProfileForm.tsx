import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

// Create a schema for freelancer profile
const profileSchema = z.object({
  profession: z.string().min(2, 'Profession is required'),
  bio: z.string().min(30, 'Bio should be at least 30 characters'),
  skills: z.string().min(3, 'Add at least one skill'),
  hourlyRate: z.string().min(1).refine((val) => !isNaN(Number(val)), {
    message: 'Hourly rate must be a number',
  }),
  location: z.string().min(2, 'Location is required'),
  yearsOfExperience: z.string().refine((val) => !isNaN(Number(val)), {
    message: 'Years of experience must be a number',
  }),
  timeZone: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function FreelancerProfileForm() {
  const [skillInput, setSkillInput] = useState('');
  const [skillsList, setSkillsList] = useState<string[]>([]);
  const { createFreelancerProfile, updateProfile, currentUser, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Initialize form with default values
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      profession: '',
      bio: '',
      skills: '',
      hourlyRate: '',
      location: '',
      yearsOfExperience: '',
      timeZone: '',
      websiteUrl: '',
      imageUrl: '',
    },
  });

  // Fetch the user's freelancer profile if they already have one
  const { data: dashboardData, isLoading: profileLoading } = useQuery<any>({
    queryKey: ['/api/freelancer/dashboard'],
    enabled: !!currentUser && !currentUser.isClient,
  });
  
  // Update form with existing profile data when it's loaded
  useEffect(() => {
    if (dashboardData && dashboardData.freelancer) {
      setIsEditMode(true);
      
      // Update the skills list
      if (dashboardData.freelancer.skills && Array.isArray(dashboardData.freelancer.skills)) {
        setSkillsList(dashboardData.freelancer.skills);
      }
      
      // Set form values with existing profile data
      form.reset({
        profession: dashboardData.freelancer.profession || '',
        bio: dashboardData.freelancer.bio || '',
        skills: dashboardData.freelancer.skills?.join(',') || '',
        hourlyRate: dashboardData.freelancer.hourlyRate?.toString() || '',
        location: dashboardData.freelancer.location || '',
        yearsOfExperience: dashboardData.freelancer.yearsOfExperience?.toString() || '',
        timeZone: dashboardData.freelancer.timeZone || '',
        websiteUrl: dashboardData.freelancer.websiteUrl || '',
        imageUrl: dashboardData.freelancer.imageUrl || '',
      });
    }
  }, [dashboardData, form]);

  // Add a skill to the list
  const addSkill = () => {
    if (skillInput.trim() && !skillsList.includes(skillInput.trim())) {
      const newSkillsList = [...skillsList, skillInput.trim()];
      setSkillsList(newSkillsList);
      setSkillInput('');
      form.setValue('skills', newSkillsList.join(','));
    }
  };

  // Remove a skill from the list
  const removeSkill = (skill: string) => {
    const updatedSkills = skillsList.filter((s) => s !== skill);
    setSkillsList(updatedSkills);
    form.setValue('skills', updatedSkills.join(','));
  };

  // Handle key press in skills input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill();
    }
  };

  // Form submission
  const onSubmit = async (data: ProfileFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Prepare the data for API submission
      const profileData = {
        profession: data.profession,
        skills: skillsList,
        bio: data.bio,
        hourlyRate: Number(data.hourlyRate),
        location: data.location,
        yearsOfExperience: data.yearsOfExperience ? Number(data.yearsOfExperience) : null,
        timeZone: data.timeZone || null,
        availability: true,
        websiteUrl: data.websiteUrl || null,
        imageUrl: data.imageUrl || null,
      };

      if (isEditMode && dashboardData && dashboardData.freelancer) {
        // Update existing profile
        await updateProfile({
          ...profileData,
          id: dashboardData.freelancer.id
        });
        
        toast({
          title: 'Profile Updated',
          description: 'Your freelancer profile has been updated successfully!',
        });
      } else {
        // Create new profile
        await createFreelancerProfile(profileData);
        
        toast({
          title: 'Profile Created',
          description: 'Your freelancer profile has been created successfully!',
        });
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/freelancer/dashboard'] });
      
      // Add delay to allow server state to update
      setTimeout(() => {
        // Clear any cached data that might be stale
        window.sessionStorage.removeItem('user-data');
        
        // Redirect to home page 
        setLocation('/');
        
        // Reload the page after a short delay to ensure fresh state
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }, 300);
    } catch (error: any) {
      toast({
        title: isEditMode ? 'Profile Update Failed' : 'Profile Creation Failed',
        description: error.message || 'An error occurred while updating your profile',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-indigo-500/10 to-indigo-600/10 rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-primary">
          {isEditMode ? 'Edit Your Freelancer Profile' : 'Create Your Freelancer Profile'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {isEditMode 
            ? 'Update your profile information to attract more clients and improve your match score' 
            : 'Complete your profile to start receiving job requests and client matches'}
        </p>
      </div>

      <Card className="border-t-4 border-t-primary shadow-md">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="profession"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">Profession</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g. Web Developer, Graphic Designer" 
                            className="h-11"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Your main professional title
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="hourlyRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">Hourly Rate ($)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input 
                              type="number" 
                              placeholder="25" 
                              className="pl-7 h-11"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Your hourly rate in USD
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="timeZone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">Time Zone (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. EST, GMT+1" className="h-11" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your preferred time zone for work
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">Location</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g. New York, Remote" 
                            className="h-11"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Your current location or work preference
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="yearsOfExperience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">Years of Experience</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="3" 
                            className="h-11"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          How many years of experience you have
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="websiteUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">Website/Portfolio URL (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://your-portfolio.com" 
                            className="h-11"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Link to your personal website or portfolio
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="bg-muted/30 p-5 rounded-lg">
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">Bio</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell clients about yourself, your expertise, and your work experience..."
                          className="min-h-[150px] bg-background"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum 30 characters - A detailed bio helps clients understand your expertise
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="bg-muted/30 p-5 rounded-lg">
                <FormField
                  control={form.control}
                  name="skills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">Skills</FormLabel>
                      <div className="flex gap-3">
                        <FormControl className="flex-1">
                          <Input 
                            placeholder="Add a skill and press Enter"
                            className="h-11 bg-background"
                            value={skillInput}
                            onChange={(e) => setSkillInput(e.target.value)}
                            onKeyDown={handleKeyPress}
                          />
                        </FormControl>
                        <Button 
                          type="button" 
                          onClick={addSkill}
                          size="lg"
                          className="px-4"
                        >
                          Add Skill
                        </Button>
                      </div>
                      <FormDescription>
                        Add your skills one by one - These are used for matching with client projects
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex flex-wrap gap-2 mt-4">
                  {skillsList.map((skill, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="px-3 py-2 text-sm bg-primary/10 hover:bg-primary/20 transition-colors"
                    >
                      {skill}
                      <button 
                        type="button"
                        className="ml-2 text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => removeSkill(skill)}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                  {skillsList.length === 0 && (
                    <p className="text-muted-foreground text-sm italic py-2">
                      No skills added yet. Add skills to improve your match score.
                    </p>
                  )}
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Profile Image URL (Optional)</FormLabel>
                    <FormControl>
                      <div className="flex gap-4 items-start">
                        <div className="w-16 h-16 rounded-full overflow-hidden border bg-muted flex items-center justify-center">
                          {field.value ? (
                            <img src={field.value} alt="Profile preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-3xl text-muted-foreground">?</div>
                          )}
                        </div>
                        <Input 
                          placeholder="https://example.com/your-image.jpg" 
                          className="flex-1 h-11"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      URL to your profile image - Profiles with images receive more client interest
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4 flex justify-end">
                <Button 
                  type="submit" 
                  disabled={isSubmitting || authLoading || profileLoading}
                  size="lg"
                  className="min-w-[150px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {isEditMode ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    isEditMode ? 'Update Profile' : 'Create Profile'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}