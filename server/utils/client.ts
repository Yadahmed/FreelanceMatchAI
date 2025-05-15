import type { User } from '@shared/schema';

/**
 * Extract a display name for a client using available information
 * 
 * @param client The client object (user)
 * @returns A display name string
 */
export function extractClientName(client: any): string {
  if (!client) {
    return "Unknown Client";
  }
  
  // First priority: use the client's display name
  if (client.displayName) {
    return client.displayName;
  }
  
  // Second priority: use the username from the client object
  if (client.username) {
    return client.username;
  }
  
  // Last resort: use generic name with ID
  return client.id ? `Client ${client.id}` : "Unknown Client";
}