import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/query-client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Plus, PlusCircle, Briefcase } from 'lucide-react';

// Define the schema for job request validation
const jobRequestSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters long' }),
  description: z.string().min(20, { message: 'Description must be at least 20 characters long' }),
  budget: z.string().optional(),
  skills: z.array(z.string()).optional(),
});

type JobRequestValues = z.infer<typeof jobRequestSchema>;

interface JobRequestFormProps {
  freelancerId: number;
  freelancerName: string;
  trigger?: React.ReactNode;
}

export function JobRequestForm({ freelancerId, freelancerName, trigger }: JobRequestFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [currentSkill, setCurrentSkill] = useState('');

  // Initialize the form with default values
  const form = useForm<JobRequestValues>({
    resolver: zodResolver(jobRequestSchema),
    defaultValues: {
      title: '',
      description: '',
      budget: '',
      skills: [],
    },
  });

  // Handle skill input
  const handleAddSkill = () => {
    if (currentSkill.trim() && !skills.includes(currentSkill.trim())) {
      const newSkills = [...skills, currentSkill.trim()];
      setSkills(newSkills);
      form.setValue('skills', newSkills);
      setCurrentSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const newSkills = skills.filter(skill => skill !== skillToRemove);
    setSkills(newSkills);
    form.setValue('skills', newSkills);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  // Handle form submission
  const onSubmit = async (data: JobRequestValues) => {
    setIsSubmitting(true);
    
    try {
      const response = await apiRequest('/api/client/job-requests', {
        method: 'POST',
        body: JSON.stringify({
          freelancerId,
          title: data.title,
          description: data.description,
          budget: data.budget ? parseFloat(data.budget) : null,
          skills: data.skills,
        }),
      });

      if (response) {
        toast({
          title: 'Job Request Sent',
          description: `Your job request has been sent to ${freelancerName}`,
        });
        
        // Invalidate job request queries
        queryClient.invalidateQueries({ queryKey: ['/api/client/job-requests'] });
        
        // Close the dialog and reset the form
        setIsOpen(false);
        form.reset();
        setSkills([]);
      }
    } catch (error: any) {
      console.error('Error sending job request:', error);
      toast({
        title: 'Error Sending Request',
        description: error.message || 'Failed to send job request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Briefcase className="h-4 w-4" />
            Send Job Request
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Send Job Request to {freelancerName}</DialogTitle>
          <DialogDescription>
            Provide details about your project to help the freelancer understand your needs.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Website Redesign, Mobile App Development" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your project in detail. What are your goals, requirements, timeline, etc."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Be specific to help the freelancer understand your needs.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget (USD)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g. 500"
                      min="0"
                      step="0.01"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional. Enter your budget for this project.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="skills"
              render={() => (
                <FormItem>
                  <FormLabel>Required Skills</FormLabel>
                  <div className="flex items-center space-x-2">
                    <FormControl>
                      <Input
                        placeholder="e.g. JavaScript, UI Design"
                        value={currentSkill}
                        onChange={(e) => setCurrentSkill(e.target.value)}
                        onKeyDown={handleKeyDown}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddSkill}
                      disabled={!currentSkill.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormDescription>
                    Add skills that are required for this project.
                  </FormDescription>
                  <FormMessage />
                  
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {skills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="gap-1 pr-1">
                          {skill}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 rounded-full p-0"
                            onClick={() => handleRemoveSkill(skill)}
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Remove {skill}</span>
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </FormItem>
              )}
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Request'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}