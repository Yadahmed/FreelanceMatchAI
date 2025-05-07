import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '@/lib/firebase';
import { User } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isClient: boolean;
  isFreelancer: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (username: string, email: string, password: string, displayName?: string, isClient?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  createFreelancerProfile: (profileData: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      
      if (user) {
        try {
          // Get ID token from Firebase
          const token = await user.getIdToken();
          
          // Try to get user data from backend
          try {
            const response = await apiRequest('/api/auth/me', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            setCurrentUser(response.user);
          } catch (error) {
            // User exists in Firebase but not in backend database
            // Try to login/register on the backend
            try {
              const loginData = {
                email: user.email || '',
                password: '', // Password is handled by Firebase
                displayName: user.displayName || user.email?.split('@')[0] || 'User',
                photoURL: user.photoURL || null,
                firebaseUid: user.uid
              };
              
              const response = await apiRequest('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify(loginData)
              });
              
              setCurrentUser(response.user);
            } catch (loginError) {
              console.error('Error logging in user:', loginError);
              setCurrentUser(null);
            }
          }
        } catch (error) {
          console.error('Authentication error:', error);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase not configured. Please add the required Firebase secrets.');
    }
    
    try {
      setIsLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken();
      
      // Login with backend
      const loginData = {
        email: user.email || '',
        password: '', // Password is handled by Firebase
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        photoURL: user.photoURL || null,
        firebaseUid: user.uid
      };
      
      const response = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData)
      });
      
      setCurrentUser(response.user);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase not configured. Please add the required Firebase secrets.');
    }
    
    try {
      setIsLoading(true);
      
      // Attempt Firebase login with better error handling
      let result;
      try {
        result = await signInWithEmailAndPassword(auth, email, password);
      } catch (firebaseError: any) {
        // Format Firebase errors for better user experience
        if (firebaseError.code === 'auth/user-not-found') {
          throw new Error('No account found with this email. Please register first.');
        } else if (firebaseError.code === 'auth/wrong-password') {
          throw new Error('Incorrect password. Please try again or reset your password.');
        } else if (firebaseError.code === 'auth/invalid-login-credentials') {
          throw new Error('Invalid login credentials. Please check your email and password.');
        } else {
          // Re-throw the original error with a clearer message if possible
          throw new Error(firebaseError.message || 'Authentication failed');
        }
      }
      
      const user = result.user;
      
      // Login with backend
      const loginData = {
        email: user.email || '',
        password: '', // Password is handled by Firebase
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        photoURL: user.photoURL || null,
        firebaseUid: user.uid
      };
      
      try {
        const response = await apiRequest('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(loginData)
        });
        
        setCurrentUser(response.user);
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      } catch (backendError: any) {
        // If there's a username conflict during automatic account creation
        if (backendError.message && backendError.message.includes('Username already taken')) {
          throw new Error('Account creation error. Please try registering with a different username.');
        }
        throw backendError;
      }
    } catch (error) {
      console.error('Email sign in error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUpWithEmail = async (username: string, email: string, password: string, displayName?: string, isClient: boolean = true) => {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase not configured. Please add the required Firebase secrets.');
    }
    
    try {
      setIsLoading(true);
      
      // First check if a username is unique on our backend
      try {
        const checkResponse = await apiRequest(`/api/auth/check-username?username=${encodeURIComponent(username)}`, {
          method: 'GET'
        });
        
        if (checkResponse && checkResponse.exists) {
          throw new Error('Username already taken. Please choose a different username.');
        }
      } catch (usernameError: any) {
        // If it's our custom error, throw it
        if (usernameError.message && usernameError.message.includes('Username already taken')) {
          throw usernameError;
        }
        // Otherwise continue (might be a server error but we'll let the Firebase auth attempt proceed)
      }
      
      // Attempt to create Firebase user
      let result;
      try {
        result = await createUserWithEmailAndPassword(auth, email, password);
      } catch (firebaseError: any) {
        // Format Firebase errors for better user experience
        if (firebaseError.code === 'auth/email-already-in-use') {
          throw new Error('This email is already registered. Please log in instead.');
        } else if (firebaseError.code === 'auth/weak-password') {
          throw new Error('Password is too weak. Please use at least 8 characters.');
        } else {
          // Re-throw the original error
          throw firebaseError;
        }
      }
      
      const user = result.user;
      
      // Update profile if display name provided
      if (displayName) {
        await updateProfile(user, { displayName });
      }
      
      // Register with backend
      const userData = {
        username,
        email: user.email || email,
        password: '', // Password is handled by Firebase
        displayName: displayName || user.displayName || username,
        photoURL: user.photoURL || null,
        firebaseUid: user.uid,
        isClient
      };
      
      const response = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      
      setCurrentUser(response.user);
      
      // If username was automatically changed by the backend, notify the user
      if (response.usernameChanged) {
        console.log(`Username was changed to ${response.usernameChanged} to ensure uniqueness`);
        // You could add a toast notification here if desired
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
      // If registering as freelancer, redirect to profile creation page
      if (!isClient) {
        try {
          // Use setTimeout to ensure the redirect happens after the state is updated
          setTimeout(() => {
            window.location.href = '/freelancer-profile';
          }, 500);
          
          // Return instead of throwing - we'll still handle this as success
          return;
        } catch (e) {
          console.error("Navigation error:", e);
          // Fallback if navigation fails
          throw new Error('Failed to redirect to freelancer profile');
        }
      }
      
    } catch (error) {
      console.error('Email sign up error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await firebaseSignOut(auth);
      await apiRequest('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      queryClient.invalidateQueries(); // Invalidate all queries
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  const createFreelancerProfile = async (profileData: any): Promise<void> => {
    if (!currentUser) {
      throw new Error('You must be logged in to create a freelancer profile');
    }
    
    try {
      setIsLoading(true);
      
      // Add the userId to the profile data
      const enhancedProfileData = {
        ...profileData,
        userId: currentUser.id
      };
      
      const response = await apiRequest('/api/auth/freelancer-profile', {
        method: 'POST',
        body: JSON.stringify(enhancedProfileData)
      });
      
      // Refresh user data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
      // Update current user info to reflect freelancer status
      setCurrentUser({
        ...currentUser,
        isClient: false
      });
    } catch (error) {
      console.error('Create freelancer profile error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    currentUser,
    firebaseUser,
    isAuthenticated: !!currentUser,
    isClient: !!currentUser && currentUser.isClient,
    isFreelancer: !!currentUser && !currentUser.isClient,
    isLoading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    createFreelancerProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};