import { ReactNode, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { AuthModal } from '@/components/auth/AuthModal';

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Force show the auth modal if not authenticated
  const [showAuthModal, setShowAuthModal] = useState(!isAuthenticated);
  
  // If user is authenticated, just render the children
  if (isAuthenticated) {
    return <>{children}</>;
  }
  
  // If still loading auth state, show a loading indicator
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  // If not authenticated and not loading, show auth modal and prevent access
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-grow pt-16">
        <div className="container mx-auto py-8">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
            <p className="mb-6">
              Please sign in or register to access this part of the site.
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              Sign In / Register
            </button>
          </div>
        </div>
      </main>
      <AuthModal 
        isOpen={showAuthModal} 
        onOpenChange={(open) => setShowAuthModal(open)} 
      />
    </div>
  );
}