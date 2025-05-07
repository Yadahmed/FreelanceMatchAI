import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

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
  const { createFreelancerProfile, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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

  // Add a skill to the list
  const addSkill = () => {
    if (skillInput.trim() && !skillsList.includes(skillInput.trim())) {
      setSkillsList([...skillsList, skillInput.trim()]);
      setSkillInput('');
      form.setValue('skills', skillsList.join(','));
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

      await createFreelancerProfile(profileData);
      
      toast({
        title: 'Profile Created',
        description: 'Your freelancer profile has been created successfully!',
      });
      
      // Add delay to allow server state to update
      setTimeout(() => {
        // Clear any cached data that might be stale
        window.sessionStorage.removeItem('user-data');
        
        // Redirect to freelancer dashboard 
        setLocation('/freelancer-dashboard');
        
        // Reload the page after a short delay to ensure fresh state
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }, 300);
    } catch (error: any) {
      toast({
        title: 'Profile Creation Failed',
        description: error.message || 'An error occurred while creating your profile',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Create Your Freelancer Profile</CardTitle>
        <CardDescription>
          Complete your profile to start receiving job requests and client matches
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="profession"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profession</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Web Developer, Graphic Designer" {...field} />
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
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. New York, Remote" {...field} />
                    </FormControl>
                    <FormDescription>
                      Your current location or work preference
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hourly Rate ($)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="25" {...field} />
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
                name="yearsOfExperience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Years of Experience</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="3" {...field} />
                    </FormControl>
                    <FormDescription>
                      How many years of experience you have
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell clients about yourself, your expertise, and your work experience..."
                      className="resize-none h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Minimum 30 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="skills"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skills</FormLabel>
                  <div className="flex space-x-2">
                    <FormControl>
                      <Input
                        placeholder="Add a skill and press Enter"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        onBlur={() => skillInput && addSkill()}
                      />
                    </FormControl>
                    <Button 
                      type="button" 
                      variant="secondary"
                      onClick={(e) => {
                        e.preventDefault();
                        addSkill();
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {skillsList.map((skill) => (
                      <Badge 
                        key={skill} 
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeSkill(skill)}
                      >
                        {skill} ×
                      </Badge>
                    ))}
                  </div>
                  <FormDescription>
                    Add your skills one by one
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="timeZone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Zone (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. EST, GMT+1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="websiteUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website/Portfolio URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://your-portfolio.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile Image URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/your-image.jpg" {...field} />
                  </FormControl>
                  <FormDescription>
                    Link to your professional profile picture
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Profile...
                </>
              ) : (
                'Create Freelancer Profile'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}