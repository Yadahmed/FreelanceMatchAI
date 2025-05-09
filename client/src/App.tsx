import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "./lib/firebase";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import FreelancerProfile from "@/pages/freelancer-profile";
import FreelancerDashboard from "@/pages/freelancer-dashboard";
import ExploreFreelancers from "@/pages/explore-freelancers";
import Freelancer from "@/pages/freelancer";
import DirectChat from "@/pages/direct-chat";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AuthModal } from "@/components/auth/AuthModal";
import { AuthProvider } from "@/hooks/use-auth";

function Router() {
  // Get the current location for logging purposes
  const [location] = useLocation();
  
  // Log route changes to help with debugging
  useEffect(() => {
    console.log(`Route changed to: ${location}`);
  }, [location]);
  
  return (
    <Switch>
      <Route path="/" component={Home} />
      
      {/* Core freelancer routes */}
      <Route path="/freelancer-profile" component={FreelancerProfile} />
      <Route path="/freelancer-dashboard" component={FreelancerDashboard} />
      
      {/* Core client routes */}
      <Route path="/client-dashboard" component={Home} />
      <Route path="/client/dashboard" component={Home} />
      <Route path="/job-requests" component={Home} />
      
      {/* Common routes for both user types */}
      <Route path="/bookings" component={Home} />
      <Route path="/messages" component={Home} />
      <Route path="/notifications" component={Home} />
      <Route path="/settings" component={Home} />
      <Route path="/profile" component={Home} />
      
      {/* AI testing and diagnostic routes */}
      <Route path="/direct-chat" component={DirectChat} />
      <Route path="/ai-assistant" component={Home} />
      <Route path="/ollama-test" component={Home} />
      
      {/* Legacy redirects in case old URLs are bookmarked */}
      <Route path="/home">
        {() => {
          window.location.href = '/';
          return null;
        }}
      </Route>
      <Route path="/register">
        {() => {
          window.location.href = '/';
          return null;
        }}
      </Route>
      
      {/* Catch all - 404 route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [location] = useLocation();

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="flex flex-col min-h-screen bg-background">
          <Header />
          <main className="flex-grow pt-16">
            <Router />
          </main>
          <Footer />
          {!currentUser && (
            <AuthModal 
              isOpen={showAuthModal} 
              onOpenChange={(open) => setShowAuthModal(open)} 
            />
          )}
          <Toaster />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
