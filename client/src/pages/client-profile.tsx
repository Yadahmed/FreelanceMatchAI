import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AlertTriangle, User, AtSign, MapPin, Calendar, Edit, Save, Clock } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Define the profile update schema
const profileSchema = z.object({
  displayName: z.string().min(2, {
    message: "Display name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ClientProfile() {
  const { currentUser, isAuthenticated, updateProfile } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = React.useState(false);
  
  // Set up form with current user data
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: currentUser?.displayName || "",
      email: currentUser?.email || "",
      phone: "", // These fields aren't in our user schema, but we'll keep them in the form
      location: "",
      bio: "",
    },
  });
  
  // Reload form values when the user data changes
  React.useEffect(() => {
    if (currentUser) {
      form.reset({
        displayName: currentUser?.displayName || "",
        email: currentUser?.email || "",
        phone: "", // These fields aren't in our user schema
        location: "",
        bio: "",
      });
    }
  }, [currentUser, form]);
  
  // Handle form submission
  const onSubmit = async (data: ProfileFormValues) => {
    try {
      // Only send fields that our user model accepts
      const updateData = {
        displayName: data.displayName,
        email: data.email,
        // We exclude phone, location, and bio as they're not in our schema
      };
      
      // Call the update profile function
      await updateProfile(updateData);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle cancel editing
  const handleCancel = () => {
    form.reset({
      displayName: currentUser?.displayName || "",
      email: currentUser?.email || "",
      phone: "", // These fields aren't in our user schema
      location: "",
      bio: "",
    });
    setIsEditing(false);
  };
  
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="container mx-auto py-10">
        <Card className="w-full max-w-3xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please log in to view or edit your profile
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  // The timestamp when the user account was created
  const accountCreated = currentUser.createdAt 
    ? new Date(currentUser.createdAt).toLocaleDateString()
    : "Not available";
  
  // The user's display name or username as a fallback
  const displayName = currentUser.displayName || currentUser.username || "User";
  
  // Get the first letter of the display name for Avatar fallback
  const avatarInitial = displayName.charAt(0).toUpperCase();
  
  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={currentUser.photoURL || ""} alt={displayName} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">{avatarInitial}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{displayName}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <AtSign className="h-4 w-4" />
                  {currentUser.username || currentUser.email}
                </CardDescription>
                {/* Location field not available in our schema */}
                <CardDescription className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Member since {accountCreated}
                </CardDescription>
              </div>
            </div>
            
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} className="min-w-[120px]">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>
        
        <Tabs defaultValue="profile">
          <TabsList className="grid grid-cols-2 max-w-[400px] mx-auto">
            <TabsTrigger value="profile">Profile Information</TabsTrigger>
            <TabsTrigger value="activity">Account Activity</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            {isEditing ? (
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your display name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* These fields are left in the form but are not used in our schema
                      For a production app, we should either:
                      1. Add these fields to the schema, or
                      2. Remove them from the UI completely
                      For now, we're keeping them as visual elements but not sending the data */}
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone (Not supported yet)</FormLabel>
                          <FormControl>
                            <Input placeholder="This field is not yet available" disabled {...field} />
                          </FormControl>
                          <FormDescription>
                            This field is not supported in the current version.
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={handleCancel}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            ) : (
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Display Name</h3>
                    <p className="mt-1">{currentUser.displayName || "Not set"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                    <p className="mt-1">{currentUser.email || "Not set"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Username</h3>
                    <p className="mt-1">{currentUser.username || "Not set"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Account Type</h3>
                    <p className="mt-1">{currentUser.isClient ? "Client" : "Freelancer"}</p>
                  </div>
                </div>
                
                <div className="text-muted-foreground text-sm mt-4">
                  <AlertTriangle className="h-5 w-5 inline mr-2" />
                  Additional profile fields like phone, location, and bio will be available in a future update.
                </div>
              </CardContent>
            )}
          </TabsContent>
          
          <TabsContent value="activity">
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md border p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-50 rounded-full">
                      <Clock className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-medium">Account Created</h3>
                      <p className="text-sm text-muted-foreground">{accountCreated}</p>
                    </div>
                  </div>
                </div>
                
                {/* Add more activity items here as needed */}
              </div>
            </CardContent>
          </TabsContent>
        </Tabs>
        
        <CardFooter className="flex flex-col sm:flex-row justify-between border-t p-6 mt-4">
          <p className="text-sm text-muted-foreground">
            Last login: {currentUser.lastLogin ? new Date(currentUser.lastLogin).toLocaleString() : "Never"}
          </p>
          {!isEditing && (
            <div className="mt-4 sm:mt-0">
              <Button variant="outline" disabled>
                Download My Data
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}