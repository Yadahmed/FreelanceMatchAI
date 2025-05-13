import React, { useState, useEffect, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "./lib/firebase";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import FreelancerProfile from "@/pages/freelancer-profile";
import FreelancerDashboard from "@/pages/freelancer-dashboard";
import ExploreFreelancers from "@/pages/explore-freelancers";
import Freelancer from "@/pages/freelancer";
import DirectChat from "@/pages/direct-chat";
import Chat from "@/pages/chat";
import ClientMessages from "@/pages/client-messages";
import AdminPanel from "@/pages/AdminPanel";
import AdminLogin from "@/pages/AdminLogin";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AuthModal } from "@/components/auth/AuthModal";
import { AuthProvider } from "@/hooks/use-auth";
import { RequireAuth } from "@/components/auth/RequireAuth";

function Router() {
  // Get the current location for logging purposes
  const [location] = useLocation();
  
  // Log route changes to help with debugging
  useEffect(() => {
    console.log(`Route changed to: ${location}`);
  }, [location]);
  
  // Define public routes that don't require authentication
  const isPublicRoute = 
    location === "/" || 
    location === "/home" || 
    location === "/register" || 
    location === "/admin/login";
  
  // For admin login, we don't want to show the RequireAuth component
  if (location === "/admin/login") {
    return (
      <Switch>
        <Route path="/admin/login" component={AdminLogin} />
      </Switch>
    );
  }
  
  // For public routes, we don't need authentication
  if (isPublicRoute) {
    return (
      <Switch>
        <Route path="/" component={Home} />
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
      </Switch>
    );
  }
  
  // For protected routes, wrap them in RequireAuth
  return (
    <RequireAuth>
      <Switch>
        <Route path="/" component={Home} />
        
        {/* Core freelancer routes */}
        <Route path="/freelancer-profile" component={FreelancerProfile} />
        <Route path="/freelancer-dashboard" component={FreelancerDashboard} />
        <Route path="/explore-freelancers" component={ExploreFreelancers} />
        <Route path="/freelancer/:id" component={Freelancer} />
        
        {/* Core client routes */}
        <Route path="/client-dashboard" component={Home} />
        <Route path="/client/dashboard" component={Home} />
        <Route path="/job-requests" component={Home} />
        <Route path="/client-messages" component={ClientMessages} />
        
        {/* Common routes for both user types */}
        <Route path="/bookings" component={Home} />
        <Route path="/messages" component={ClientMessages} />
        <Route path="/messages/:id">
          {(params) => {
            // Create a dynamic import with correct naming (match by id)
            const MessagePage = React.lazy(() => import('./pages/messages/[id]'));
            return (
              <Suspense fallback={<div className="p-4 text-center">Loading message thread...</div>}>
                <MessagePage />
              </Suspense>
            );
          }}
        </Route>
        <Route path="/chat/:id" component={Chat} />
        <Route path="/notifications" component={Home} />
        <Route path="/settings" component={Home} />
        <Route path="/profile" component={Home} />
        
        {/* AI testing and diagnostic routes */}
        <Route path="/direct-chat" component={DirectChat} />
        <Route path="/ai-assistant" component={Home} />
        <Route path="/ollama-test" component={Home} />
        
        {/* Admin routes */}
        <Route path="/admin/panel" component={AdminPanel} />
        <Route path="/admin" component={AdminPanel} />
        
        {/* Catch all - 404 route */}
        <Route component={NotFound} />
      </Switch>
    </RequireAuth>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [location] = useLocation();

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, () => {
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
          <Toaster />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
