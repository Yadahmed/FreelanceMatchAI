import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  sendEmailVerification, 
  applyActionCode, 
  User as FirebaseUser,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { apiRequest } from '@/lib/queryClient';

interface EmailVerificationHookResult {
  isLoading: boolean;
  sendVerificationEmail: (user: FirebaseUser) => Promise<void>;
  verifyEmail: (actionCode: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmPasswordReset: (code: string, newPassword: string) => Promise<void>;
}

export function useEmailVerification(): EmailVerificationHookResult {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Send verification email to a user
  const sendVerificationEmail = async (user: FirebaseUser): Promise<void> => {
    try {
      setIsLoading(true);
      await sendEmailVerification(user, {
        url: `${window.location.origin}/email-verified`,
        handleCodeInApp: true,
      });
      
      toast({
        title: 'Verification Email Sent',
        description: 'Please check your inbox and click the verification link.',
      });
    } catch (error: any) {
      console.error('Error sending verification email:', error);
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to send verification email. Please try again later.',
        variant: 'destructive',
      });
      
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
      
      // Force refresh current user if logged in
      const currentUser = auth.currentUser;
      if (currentUser) {
        await currentUser.reload();
        
        // Update backend about verification
        const token = await currentUser.getIdToken(true);
        await apiRequest('/api/auth/update-verification', {
          method: 'POST',
          body: JSON.stringify({ firebaseUid: currentUser.uid, emailVerified: true }),
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
      
      toast({
        title: 'Email Verified',
        description: 'Your email has been successfully verified.',
      });
    } catch (error: any) {
      console.error('Error verifying email:', error);
      
      toast({
        title: 'Verification Failed',
        description: error.message || 'Failed to verify your email. The link may be expired or invalid.',
        variant: 'destructive',
      });
      
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
      
      toast({
        title: 'Reset Email Sent',
        description: 'Please check your inbox for password reset instructions.',
      });
    } catch (error: any) {
      console.error('Error sending password reset email:', error);
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to send password reset email. Please try again later.',
        variant: 'destructive',
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm password reset with code and new password
  const handlePasswordReset = async (code: string, newPassword: string): Promise<void> => {
    try {
      setIsLoading(true);
      
      // First verify the code is valid
      await verifyPasswordResetCode(auth, code);
      
      // Then reset the password
      await confirmPasswordReset(auth, code, newPassword);
      
      toast({
        title: 'Password Reset',
        description: 'Your password has been reset successfully. You can now log in with your new password.',
      });
    } catch (error: any) {
      console.error('Error confirming password reset:', error);
      
      toast({
        title: 'Reset Failed',
        description: error.message || 'Failed to reset your password. The link may be expired or invalid.',
        variant: 'destructive',
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    sendVerificationEmail,
    verifyEmail,
    resetPassword,
    confirmPasswordReset: handlePasswordReset,
  };
}