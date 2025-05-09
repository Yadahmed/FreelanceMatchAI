/**
 * Helper functions for authentication
 */

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
 * Get authorization headers for fetch requests
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (!token) return {};
  
  return {
    Authorization: `Bearer ${token}`
  };
}