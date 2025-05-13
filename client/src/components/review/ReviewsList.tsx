import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Rating } from '@/components/ui/rating';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

interface Review {
  id: number;
  clientId: number;
  freelancerId: number;
  jobRequestId: number | null;
  rating: number;
  comment: string | null;
  createdAt: string;
  client?: {
    username: string;
    displayName: string | null;
    photoURL: string | null;
  };
}

interface ReviewsListProps {
  freelancerId: number;
}

export function ReviewsList({ freelancerId }: ReviewsListProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['freelancerReviews', freelancerId],
    queryFn: async () => {
      const response = await apiRequest(`/api/freelancers/${freelancerId}/reviews`);
      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }
      return await response.json();
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          {[1, 2, 3].map((i) => (
            <div key={i} className="mb-4">
              <div className="flex items-start space-x-4 mb-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-16 w-full" />
              <Separator className="my-4" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reviews</CardTitle>
          <CardDescription>There was an error loading reviews.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  const reviews: Review[] = data.reviews || [];

  if (reviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reviews</CardTitle>
          <CardDescription>No reviews yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">This freelancer hasn't received any reviews yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reviews</CardTitle>
        <CardDescription>See what other clients are saying</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={review.client?.photoURL || undefined} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm">
                      {review.client?.displayName || review.client?.username || 'Anonymous Client'}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="mr-1 h-3 w-3" />
                      {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>
                <Rating value={review.rating} size="sm" />
              </div>
              
              {review.comment && (
                <div className="text-sm text-muted-foreground pl-10">
                  {review.comment}
                </div>
              )}
              
              {review.jobRequestId && (
                <div className="pl-10">
                  <Badge variant="outline" className="text-xs">Verified Job</Badge>
                </div>
              )}
              
              <Separator className="my-4" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}