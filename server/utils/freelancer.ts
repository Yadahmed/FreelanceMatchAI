import { User, Freelancer } from '@shared/schema';

/**
 * Extract a freelancer's display name from available data
 * Uses a priority system:
 * 1. User's displayName if available
 * 2. Name extracted from bio if it follows the pattern "Name is a skilled..."
 * 3. Fallback to "Freelancer [ID]"
 */
export function extractFreelancerName(
  freelancer: Freelancer, 
  user?: User | null
): string {
  // First priority: user's display name
  if (user?.displayName) {
    return user.displayName;
  }
  
  // Second priority: extract from bio if possible
  if (freelancer.bio) {
    // Many bios start with "[Name] is a skilled..." - try to extract the name
    const nameMatch = freelancer.bio.match(/^([A-Za-z\s]+)\s+is\s+a\s+/);
    if (nameMatch && nameMatch[1]) {
      return nameMatch[1].trim();
    }
  }
  
  // Third priority: fallback to ID
  return `Freelancer ${freelancer.id}`;
}