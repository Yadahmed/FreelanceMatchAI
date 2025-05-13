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
  const [selectedFreelancerId, setSelectedFreelancerId] = useState<number | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [confirmUserDeleteDialog, setConfirmUserDeleteDialog] = useState(false);
  
  // Redirect if not authenticated as admin
  useEffect(() => {
    const isAdminSession = localStorage.getItem('adminSession') === 'true';
    if (!isAdminSession) {
      window.location.href = '/admin/login';
    }
  }, []);
  
  // Fetch freelancers
  const { data: freelancers, isLoading: loadingFreelancers } = useQuery<Freelancer[]>({
    queryKey: ['/api/freelancers'],
    enabled: true
  });
  
  // Fetch users
  const { data: users, isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/users', {
        method: 'GET',
        headers: {
          'admin-session': 'true',
        },
      });
      return response.users || [];
    },
    enabled: true
  });
  
  // Add debug logging for freelancers data
  React.useEffect(() => {
    if (freelancers) {
      console.log('[AdminPanel] Freelancers data received:', freelancers);
    }
  }, [freelancers]);
  
  // Delete freelancer mutation
  const deleteFreelancerMutation = useMutation({
    mutationFn: async (freelancerId: number) => {
      const response = await apiRequest(`/api/admin/freelancers/${freelancerId}`, {
        method: 'DELETE',
        headers: {
          'admin-session': 'true',
        },
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
  
  // Delete user mutation (includes Firebase account deletion)
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'admin-session': 'true',
        },
      });
      return response;
    },
    onSuccess: (data) => {
      // Invalidate both users and freelancers queries as user deletion may affect freelancers too
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/freelancers'] });
      
      let firebaseMessage = '';
      if (data.firebaseDeleted) {
        firebaseMessage = 'Firebase authentication account was also deleted.';
      } else {
        // Show more specific error message about why Firebase account wasn't deleted
        if (data.firebaseError) {
          firebaseMessage = `Note: Firebase authentication account could not be deleted. Reason: ${data.firebaseError}`;
        } else {
          firebaseMessage = 'Note: Firebase authentication account could not be deleted.';
        }
      }
      
      toast({
        title: 'Success',
        description: `User deleted successfully. ${firebaseMessage}`,
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
  
  const handleDeleteFreelancer = (freelancerId: number) => {
    setSelectedFreelancerId(freelancerId);
    setConfirmDialogOpen(true);
  };
  
  const confirmDeleteFreelancer = () => {
    if (selectedFreelancerId) {
      deleteFreelancerMutation.mutate(selectedFreelancerId);
    }
    setConfirmDialogOpen(false);
  };
  
  const handleDeleteUser = (userId: number) => {
    setSelectedUserId(userId);
    setConfirmUserDeleteDialog(true);
  };
  
  const confirmDeleteUser = () => {
    if (selectedUserId) {
      deleteUserMutation.mutate(selectedUserId);
    }
    setConfirmUserDeleteDialog(false);
  };
  
  // Function to handle logout
  const handleLogout = () => {
    localStorage.removeItem('adminSession');
    window.location.href = '/admin/login';
  };
  
  if (loadingFreelancers) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        {/* User Management */}
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
                <TableHead>Firebase UID</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingUsers ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Loading users...</TableCell>
                </TableRow>
              ) : users && users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.displayName || 'N/A'}</TableCell>
                    <TableCell>
                      {user.isAdmin ? (
                        <Badge variant="default" className="bg-purple-600">Admin</Badge>
                      ) : user.isClient ? (
                        <Badge variant="outline">Client</Badge>
                      ) : (
                        <Badge variant="secondary">Freelancer</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.firebaseUid ? (
                        <span className="text-xs">{user.firebaseUid.substring(0, 10)}...</span>
                      ) : (
                        'No Firebase UID'
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                        className="flex items-center"
                      >
                        <UserMinus className="mr-1 h-4 w-4" /> Delete User
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">No users found</TableCell>
                </TableRow>
              )}
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
                <TableHead>Skills</TableHead>
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
                    <div className="flex flex-wrap gap-1">
                      {freelancer.skills.map((skill, index) => (
                        <Badge key={index} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
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
      
      {/* Freelancer Delete Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the freelancer profile from the system. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFreelancer} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* User Delete Confirmation Dialog */}
      <AlertDialog open={confirmUserDeleteDialog} onOpenChange={setConfirmUserDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              <p>This will permanently delete the user account, including:</p>
              <ul className="list-disc ml-6 mt-2">
                <li>User database record</li>
                <li>Any associated freelancer profile</li>
                <li>All user data (messages, reviews, etc.)</li>
                <li>Firebase authentication account</li>
              </ul>
              <p className="mt-3 font-bold text-red-600">This action cannot be undone!</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUser} className="bg-red-600 hover:bg-red-700">
              Permanently Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AdminPanel;