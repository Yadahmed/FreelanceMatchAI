import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { FreelancerProfileForm } from '@/components/freelancer/FreelancerProfileForm';

export default function FreelancerProfilePage() {
  const { currentUser, isLoading, isAuthenticated, isFreelancer } = useAuth();
  const [, setLocation] = useLocation();

  // Only redirect if not authenticated - allow newly registered freelancers to stay
  useEffect(() => {
    // If user is not authenticated at all, redirect to home
    if (!isLoading && !isAuthenticated) {
      setLocation('/');
    }
    
    // If user is already a freelancer with a complete profile, redirect to home
    // For now, just check if user is a freelancer - we'll keep them on this page during registration
    if (!isLoading && isAuthenticated && isFreelancer) {
      // In the future you could add a hasCompletedProfile flag to redirect existing freelancers
      // For now, we'll keep all freelancers on this page to complete their profile
      // setLocation('/');
    }
  }, [isLoading, isAuthenticated, isFreelancer, currentUser, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <FreelancerProfileForm />
    </div>
  );
}