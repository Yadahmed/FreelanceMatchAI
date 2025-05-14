import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile as updateFirebaseProfile,
  sendEmailVerification,
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset as firebaseConfirmReset,
  sendPasswordResetEmail
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
  isEmailVerified: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (username: string, email: string, password: string, displayName?: string, isClient?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  createFreelancerProfile: (profileData: any) => Promise<void>;
  updateProfile: (profileData: any) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  verifyEmail: (actionCode: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  handlePasswordReset: (code: string, newPassword: string) => Promise<void>;
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
          
          // Store the token in localStorage for use in API requests
          localStorage.setItem('auth_token', token);
          
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
      
      // Store token in localStorage
      localStorage.setItem('auth_token', idToken);
      
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
      
      // Redirect based on user role
      if (response.user) {
        // If user is a freelancer with a profile, redirect to freelancer dashboard
        if (!response.user.isClient && response.user.hasFreelancerProfile) {
          setTimeout(() => {
            window.location.href = '/freelancer-dashboard';
          }, 500);
        } 
        // If user is a freelancer without a profile, redirect to create one
        else if (!response.user.isClient && !response.user.hasFreelancerProfile) {
          setTimeout(() => {
            window.location.href = '/freelancer-profile';
          }, 500);
        }
        // If user is a client, redirect to client dashboard
        else if (response.user.isClient) {
          setTimeout(() => {
            window.location.href = '/client/dashboard';
          }, 500);
        }
      }
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
      
      // Get and store token
      const token = await user.getIdToken();
      localStorage.setItem('auth_token', token);
      
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
        
        // Redirect based on user role
        if (response.user) {
          // If user is a freelancer with a profile, redirect to freelancer dashboard
          if (!response.user.isClient && response.user.hasFreelancerProfile) {
            setTimeout(() => {
              window.location.href = '/freelancer-dashboard';
            }, 500);
          } 
          // If user is a freelancer without a profile, redirect to create one
          else if (!response.user.isClient && !response.user.hasFreelancerProfile) {
            setTimeout(() => {
              window.location.href = '/freelancer-profile';
            }, 500);
          }
          // If user is a client, redirect to client dashboard
          else if (response.user.isClient) {
            setTimeout(() => {
              window.location.href = '/client/dashboard';
            }, 500);
          }
        }
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
    // Log the correct role is being passed
    console.log('[signUpWithEmail] Starting registration with role:', isClient ? 'CLIENT' : 'FREELANCER');
    
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
          throw new Error('Password is too weak. Please use at least 6 characters.');
        } else {
          // Re-throw the original error
          throw firebaseError;
        }
      }
      
      const user = result.user;
      
      // Get and store token
      const token = await user.getIdToken();
      localStorage.setItem('auth_token', token);
      
      // Update profile if display name provided
      if (displayName) {
        await updateFirebaseProfile(user, { displayName });
      }
      
      // Send verification email
      try {
        await sendEmailVerification(user, {
          url: `${window.location.origin}/email-verified`, // Redirect URL after verification
          handleCodeInApp: true,
        });
        // Show toast or notification that verification email has been sent
        console.log('Verification email sent to:', email);
      } catch (verificationError) {
        console.error('Error sending verification email:', verificationError);
        // Continue with registration even if verification email fails
      }
      
      // Register with backend
      const userData = {
        username,
        email: user.email || email,
        password: '', // Password is handled by Firebase
        displayName: displayName || user.displayName || username,
        photoURL: user.photoURL || null,
        firebaseUid: user.uid,
        isClient,
        emailVerified: user.emailVerified
      };
      
      console.log('[signUpWithEmail] Sending user data to backend with isClient =', isClient);
      console.log('[signUpWithEmail] Full userData object:', userData);
      
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
      
      // Show verification message to the user
      // This should be handled by the UI component displaying a success message
      // and informing the user to check their email
      
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
      
      // Also clear auth token from localStorage
      localStorage.removeItem('auth_token');
      
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
    if (!currentUser || !firebaseUser) {
      throw new Error('You must be logged in to create a freelancer profile');
    }
    
    try {
      setIsLoading(true);
      
      // Add the userId to the profile data
      const enhancedProfileData = {
        ...profileData,
        userId: currentUser.id
      };
      
      // Get a fresh token - critical for auth to work
      const token = await firebaseUser.getIdToken(true); // Force refresh token
      
      // Update token in localStorage
      localStorage.setItem('auth_token', token);
      
      console.log('[createFreelancerProfile] Got fresh token for auth');
      
      // Create the freelancer profile with the auth token
      const response = await apiRequest('/api/auth/freelancer-profile', {
        method: 'POST',
        body: JSON.stringify(enhancedProfileData),
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Freelancer profile created:', response);
      
      // Update current user in state immediately to reflect role change
      setCurrentUser({
        ...currentUser,
        isClient: false // Mark as freelancer in local state
      });
      
      // Force refresh user data from server
      try {
        // Get fresh user data from the server
        const token = await firebaseUser?.getIdToken(true); // Force refresh
        
        // Update token in localStorage
        localStorage.setItem('auth_token', token);
        
        const meResponse = await apiRequest('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Update with server data
        setCurrentUser(meResponse.user);
        console.log('Updated user role from server:', meResponse.user);
        
        // Force a page redirect to ensure roles take effect
        if (meResponse.user && !meResponse.user.isClient && meResponse.user.hasFreelancerProfile) {
          window.location.href = '/freelancer-dashboard';
        }
        
        // Also invalidate any cached queries
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      } catch (refreshError) {
        console.error('Error refreshing user data:', refreshError);
        // Continue since we've already updated the local state
      }
    } catch (error) {
      console.error('Create freelancer profile error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Send verification email to the currently logged in user
  const updateProfile = async (profileData: any): Promise<void> => {
    if (!currentUser || !firebaseUser) {
      throw new Error('You must be logged in to update your profile');
    }
    
    try {
      setIsLoading(true);
      
      // Get a fresh token
      const token = await firebaseUser.getIdToken(true); // Force refresh token
      
      // Update token in localStorage
      localStorage.setItem('auth_token', token);
      
      // Update the user profile
      const response = await apiRequest('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          ...profileData,
          userId: currentUser.id
        }),
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Update Firebase profile if display name is provided
      if (profileData.displayName) {
        // Use the Firebase function by using its imported name directly to avoid conflict with our own updateProfile function
        await updateFirebaseProfile(firebaseUser, { 
          displayName: profileData.displayName 
        });
      }
      
      // Update current user in state
      setCurrentUser({
        ...currentUser,
        ...response.user
      });
      
      // Force refresh user data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  const sendVerificationEmail = async (): Promise<void> => {
    if (!firebaseUser) {
      throw new Error('You must be logged in to verify your email');
    }
    
    try {
      setIsLoading(true);
      await sendEmailVerification(firebaseUser, {
        url: `${window.location.origin}/email-verified`,
        handleCodeInApp: true,
      });
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Verify email with action code
  const verifyEmail = async (actionCode: string): Promise<void> => {
    try {
      setIsLoading(true);
      await applyActionCode(auth, actionCode);
      
      // Force refresh the token to update emailVerified status
      if (firebaseUser) {
        await firebaseUser.reload();
        const token = await firebaseUser.getIdToken(true);
        localStorage.setItem('auth_token', token);
        
        // Update the backend about email verification
        await apiRequest('/api/auth/update-verification', {
          method: 'POST',
          body: JSON.stringify({ firebaseUid: firebaseUser.uid, emailVerified: true }),
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Error verifying email:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Send password reset email
  const resetPassword = async (email: string): Promise<void> => {
    try {
      setIsLoading(true);
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/reset-password-confirm`,
        handleCodeInApp: true,
      });
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Confirm password reset with the code and new password
  const handlePasswordReset = async (code: string, newPassword: string): Promise<void> => {
    try {
      setIsLoading(true);
      // Verify the code is valid before resetting
      await verifyPasswordResetCode(auth, code);
      
      // Reset the password using the Firebase function
      await firebaseConfirmReset(auth, code, newPassword);
    } catch (error) {
      console.error('Error confirming password reset:', error);
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
    isEmailVerified: !!firebaseUser && firebaseUser.emailVerified,
    isLoading,
    sendVerificationEmail,
    verifyEmail,
    resetPassword,
    handlePasswordReset,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    createFreelancerProfile,
    updateProfile
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