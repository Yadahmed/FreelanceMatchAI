/**
 * Helper functions for authentication
 */
import { auth } from '@/lib/firebase';

/**
 * Get the authentication token from localStorage
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

/**
 * Check if the user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * Get a fresh token and store it in localStorage
 */
export async function refreshAuthToken(): Promise<string | null> {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    
    // Force token refresh
    const token = await user.getIdToken(true);
    localStorage.setItem('auth_token', token);
    return token;
  } catch (error) {
    console.error('Error refreshing auth token:', error);
    return null;
  }
}

/**
 * Get authorization headers for fetch requests
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (!token) return {};
  
  // When we return the token, also trigger a refresh in the background
  // for the next request
  refreshAuthToken().catch(console.error);
  
  return {
    Authorization: `Bearer ${token}`
  };
}