import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { FreelancerProfileForm } from '@/components/freelancer/FreelancerProfileForm';

export default function FreelancerProfilePage() {
  const { currentUser, isLoading, isAuthenticated, isFreelancer } = useAuth();
  const [, setLocation] = useLocation();

  // If user is authenticated but already a freelancer, redirect to home
  useEffect(() => {
    if (!isLoading && isAuthenticated && isFreelancer) {
      setLocation('/');
    }
    
    // If user is not authenticated, redirect to login
    if (!isLoading && !isAuthenticated) {
      setLocation('/');
    }
  }, [isLoading, isAuthenticated, isFreelancer, setLocation]);

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