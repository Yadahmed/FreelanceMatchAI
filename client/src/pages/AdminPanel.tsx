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
      
      const firebaseStatus = data.firebaseDeleted 
        ? 'Firebase authentication account was also deleted.' 
        : 'Note: Firebase authentication account could not be deleted.';
      
      toast({
        title: 'Success',
        description: `User deleted successfully. ${firebaseStatus}`,
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
  
  const confirmDelete = () => {
    if (selectedFreelancerId) {
      deleteFreelancerMutation.mutate(selectedFreelancerId);
    }
    setConfirmDialogOpen(false);
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