import { queryClient } from './queryClient';

/**
 * A client-side storage service with caching for common data
 */
class ClientStorage {
  /**
   * Get all freelancers from cache or API
   */
  async getAllFreelancers() {
    try {
      // Try to get cached freelancers first
      const cachedData = queryClient.getQueryData(['freelancers']);
      if (cachedData) {
        return cachedData;
      }
      
      // If not cached, fetch from API
      const response = await fetch('/api/freelancers');
      if (!response.ok) {
        throw new Error('Failed to fetch freelancers');
      }
      
      const data = await response.json();
      
      // Cache the data for future use
      queryClient.setQueryData(['freelancers'], data);
      
      return data;
    } catch (error) {
      console.error('Error fetching freelancers:', error);
      return [];
    }
  }
  
  /**
   * Get all users from cache or API
   */
  async getAllUsers() {
    try {
      // Try to get cached users first
      const cachedData = queryClient.getQueryData(['users']);
      if (cachedData) {
        return cachedData;
      }
      
      // If not cached, fetch from API (admin only endpoint)
      const response = await fetch('/api/admin/users', {
        headers: {
          'admin-session': 'true'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      
      // Cache the data for future use
      queryClient.setQueryData(['users'], data);
      
      return data;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }
  
  /**
   * Get a single freelancer by ID
   */
  async getFreelancer(id: number) {
    try {
      // Try to get from cache first
      const cachedFreelancers = queryClient.getQueryData(['freelancers']) as any[] || [];
      const cachedFreelancer = cachedFreelancers.find(f => f.id === id);
      
      if (cachedFreelancer) {
        return cachedFreelancer;
      }
      
      // If not cached, fetch from API
      const response = await fetch(`/api/freelancers/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch freelancer ${id}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error fetching freelancer ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Get a single user by ID
   */
  async getUser(id: number) {
    try {
      // Try to get from cache first
      const cachedUsers = queryClient.getQueryData(['users']) as any[] || [];
      const cachedUser = cachedUsers.find(u => u.id === id);
      
      if (cachedUser) {
        return cachedUser;
      }
      
      // If not cached, fetch from API (admin only endpoint)
      const response = await fetch(`/api/admin/users/${id}`, {
        headers: {
          'admin-session': 'true'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user ${id}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error fetching user ${id}:`, error);
      return null;
    }
  }
}

export const storage = new ClientStorage();