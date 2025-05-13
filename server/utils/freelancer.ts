import type { User } from '@shared/schema';

/**
 * Extract a display name for a freelancer using available information
 * 
 * @param freelancer The freelancer object
 * @param user The associated user object (optional)
 * @returns A display name string
 */
export function extractFreelancerName(freelancer: any, user?: User | null): string {
  // First priority: use the user's display name
  if (user?.displayName) {
    return user.displayName;
  }
  
  // Second priority: use any displayName property on the freelancer (might be added)
  if (freelancer.displayName) {
    return freelancer.displayName;
  }
  
  // Third priority: use the username from the user object
  if (user?.username) {
    return user.username;
  }
  
  // Last resort: use generic name with ID
  return `Freelancer ${freelancer.id}`;
}