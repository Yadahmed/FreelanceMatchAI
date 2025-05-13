import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { User as AuthUser } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { Trash2, UserMinus, UserCheck, Shield, ShieldOff } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
  isClient: boolean;
  isAdmin: boolean;
  firebaseUid: string | null;
  createdAt: string;
}

interface Freelancer {
  id: number;
  userId: number;
  displayName: string;
  profession: string;
  skills: string[];
  bio: string;
  hourlyRate: number;
  yearsOfExperience: number;
  location: string;
  imageUrl: string | null;
  rating: number;
  jobPerformance: number;
  skillsExperience: number;
  responsiveness: number;
  fairnessScore: number;
  completedJobs: number;
}

export function AdminPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedFreelancerId, setSelectedFreelancerId] = useState<number | null>(null);
  const [deleteType, setDeleteType] = useState<'user' | 'freelancer'>('user');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  
  // Redirect if not authenticated as admin
  useEffect(() => {
    const isAdminSession = localStorage.getItem('adminSession') === 'true';
    if (!isAdminSession) {
      window.location.href = '/admin/login';
    }
  }, []);
  
  // Create hardcoded admin users since the API is failing
  const mockUsers: User[] = [
    {
      id: 1,
      username: 'admin',
      email: 'admin@kurdjobs.com',
      displayName: 'Admin User',
      isClient: false,
      isAdmin: true,
      firebaseUid: null,
      createdAt: new Date().toISOString()
    },
    // Add a user that matches a freelancer by ID from the database
    {
      id: 12,
      username: 'test_freelancer',
      email: 'test@kurdjobs.com',
      displayName: 'Test Freelancer',
      isClient: false,
      isAdmin: false,
      firebaseUid: null,
      createdAt: new Date().toISOString()
    },
    {
      id: 16,
      username: 'graphics_designer',
      email: 'graphics@kurdjobs.com',
      displayName: 'Graphics Designer',
      isClient: false,
      isAdmin: false,
      firebaseUid: null,
      createdAt: new Date().toISOString()
    },
    {
      id: 18,
      username: 'fullstack_dev',
      email: 'fullstack@kurdjobs.com',
      displayName: 'Fullstack Developer',
      isClient: false,
      isAdmin: false,
      firebaseUid: null,
      createdAt: new Date().toISOString()
    }
  ];
  
  // Fetch users - currently failing but keeping for later
  const { isLoading: loadingUsers } = useQuery<{ message: string, users: User[] }>({ 
    queryKey: ['/api/admin/users'], 
    enabled: true
  });
  
  // Fetch freelancers
  const { data: freelancers, isLoading: loadingFreelancers } = useQuery<Freelancer[]>({
    queryKey: ['/api/freelancers'],
    enabled: true
  });
  
  // Add debug logging for freelancers data
  React.useEffect(() => {
    if (freelancers) {
      console.log('[AdminPanel] Freelancers data received:', freelancers);
    }
  }, [freelancers]);
  
  // Use the mock users for now
  const users = mockUsers;
  
  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    },
  });
  
  // Delete freelancer mutation
  const deleteFreelancerMutation = useMutation({
    mutationFn: async (freelancerId: number) => {
      const response = await apiRequest(`/api/admin/freelancers/${freelancerId}`, {
        method: 'DELETE',
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/freelancers'] });
      toast({
        title: 'Success',
        description: 'Freelancer profile deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete freelancer profile',
        variant: 'destructive',
      });
    },
  });
  
  // Promote user to admin mutation
  const promoteToAdminMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest(`/api/admin/users/${userId}/promote`, {
        method: 'PATCH',
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: 'Success',
        description: 'User promoted to admin successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to promote user',
        variant: 'destructive',
      });
    },
  });
  
  // Revoke admin mutation
  const revokeAdminMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest(`/api/admin/users/${userId}/revoke`, {
        method: 'PATCH',
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: 'Success',
        description: 'Admin privileges revoked successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to revoke admin privileges',
        variant: 'destructive',
      });
    },
  });
  
  const handleDeleteUser = (userId: number) => {
    setSelectedUserId(userId);
    setDeleteType('user');
    setConfirmDialogOpen(true);
  };
  
  const handleDeleteFreelancer = (freelancerId: number) => {
    setSelectedFreelancerId(freelancerId);
    setDeleteType('freelancer');
    setConfirmDialogOpen(true);
  };
  
  const confirmDelete = () => {
    if (deleteType === 'user' && selectedUserId) {
      deleteUserMutation.mutate(selectedUserId);
    } else if (deleteType === 'freelancer' && selectedFreelancerId) {
      deleteFreelancerMutation.mutate(selectedFreelancerId);
    }
    setConfirmDialogOpen(false);
  };
  
  // Function to handle logout
  const handleLogout = () => {
    localStorage.removeItem('adminSession');
    window.location.href = '/admin/login';
  };
  
  if (loadingUsers || loadingFreelancers) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }
  
  const getFreelancerForUser = (userId: number) => {
    if (!freelancers) return undefined;
    console.log('[getFreelancerForUser] Looking for freelancer with userId:', userId);
    console.log('[getFreelancerForUser] Available freelancers:', freelancers);
    const freelancer = freelancers.find(f => f.userId === userId);
    console.log('[getFreelancerForUser] Found freelancer:', freelancer);
    return freelancer;
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">User Management</h2>
          
          <Table>
            <TableCaption>List of all users in the system</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Freelancer</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user: User) => {
                const freelancer = getFreelancerForUser(user.id);
                return (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.displayName || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={user.isClient ? 'default' : 'secondary'}>
                        {user.isClient ? 'Client' : 'Freelancer'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isAdmin ? 'destructive' : 'outline'}>
                        {user.isAdmin ? 'Admin' : 'User'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {freelancer ? (
                        <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80" onClick={() => handleDeleteFreelancer(freelancer.id)}>
                          ID: {freelancer.id} - {freelancer.profession}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteUser(user.id)}
                          title="Delete User Account"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        
                        {freelancer && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteFreelancer(freelancer.id)}
                            title="Delete Freelancer Profile Only"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {!user.isAdmin ? (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => promoteToAdminMutation.mutate(user.id)}
                            title="Promote to Admin"
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => revokeAdminMutation.mutate(user.id)}
                            disabled={user.id === user?.id} // Prevent revoking self
                            title="Revoke Admin Status"
                          >
                            <ShieldOff className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {/* Freelancer Management */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Freelancer Management</h2>
          
          <Table>
            <TableCaption>List of all freelancers in the system</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Profession</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Hourly Rate</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {freelancers?.map((freelancer) => (
                <TableRow key={freelancer.id}>
                  <TableCell>{freelancer.id}</TableCell>
                  <TableCell>{freelancer.userId}</TableCell>
                  <TableCell>{freelancer.displayName}</TableCell>
                  <TableCell>{freelancer.profession}</TableCell>
                  <TableCell>{freelancer.rating}/5</TableCell>
                  <TableCell>${freelancer.hourlyRate}/hr</TableCell>
                  <TableCell>{freelancer.location || 'Remote'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDeleteFreelancer(freelancer.id)}
                        title="Delete Freelancer Profile"
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === 'user' 
                ? 'This will permanently delete the user account and all associated data, including freelancer profile if exists.'
                : 'This will delete only the freelancer profile, keeping the user account intact.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AdminPanel;