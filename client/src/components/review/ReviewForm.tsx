import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';

// Schema for review form validation
const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(5, "Please provide a comment with at least 5 characters"),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  freelancerId: number;
  jobRequestId?: number | null;
  onReviewSubmitted?: () => void;
}

export function ReviewForm({ freelancerId, jobRequestId, onReviewSubmitted }: ReviewFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const { toast } = useToast();

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      comment: '',
    },
  });

  // Handle rating star click
  const handleRatingClick = (rating: number) => {
    setSelectedRating(rating);
    form.setValue('rating', rating);
  };

  const onSubmit = async (values: ReviewFormValues) => {
    setIsSubmitting(true);
    try {
      // Make the API request to submit the review
      const response = await apiRequest('/api/client/reviews', {
        method: 'POST',
        body: JSON.stringify({
          freelancerId,
          jobRequestId: jobRequestId || null,
          rating: values.rating,
          comment: values.comment,
        }),
      });

      if (response.ok) {
        toast({
          title: "Review Submitted",
          description: "Thank you for your feedback!",
        });

        // Reset the form
        form.reset();
        setSelectedRating(0);

        // Call the onReviewSubmitted callback if provided
        if (onReviewSubmitted) {
          onReviewSubmitted();
        }
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit review');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave a Review</CardTitle>
        <CardDescription>Your feedback helps freelancers improve and helps other clients make informed decisions.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rating</FormLabel>
                  <FormControl>
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <Star
                          key={rating}
                          className={`w-6 h-6 cursor-pointer ${
                            rating <= selectedRating
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-300'
                          }`}
                          onClick={() => handleRatingClick(rating)}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Select a rating from 1 to 5 stars
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Review</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write your review here..."
                      className="min-h-[100px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || selectedRating === 0}
            >
              {isSubmitting ? "Submitting..." : "Submit Review"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}