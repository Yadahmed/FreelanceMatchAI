import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Define the form schema
const availabilityFormSchema = z.object({
  status: z.enum(["available", "unavailable", "limited"]),
  message: z.string().optional(),
  availableFrom: z.string().optional(),
  availableUntil: z.string().optional(),
  workHours: z.object({
    start: z.string(),
    end: z.string(),
  }),
  workDays: z.array(z.number().min(0).max(6)),
});

type AvailabilityFormValues = z.infer<typeof availabilityFormSchema>;

// Day names for the day selector
const dayNames = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function FreelancerAvailability() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch freelancer dashboard data to get current availability
  const { data: dashboardData, isLoading } = useQuery<any>({
    queryKey: ["/api/freelancer/dashboard"],
    enabled: !!currentUser && !currentUser.isClient,
  });

  // Set up the form with the current availability values
  const form = useForm<AvailabilityFormValues>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: {
      status: "available",
      message: "",
      availableFrom: "",
      availableUntil: "",
      workHours: {
        start: "09:00",
        end: "17:00",
      },
      workDays: [1, 2, 3, 4, 5], // Monday to Friday by default
    },
  });

  // Update form values when data is loaded
  React.useEffect(() => {
    if (dashboardData?.freelancer?.availabilityDetails) {
      const details = dashboardData.freelancer.availabilityDetails;
      
      form.reset({
        status: details.status || "available",
        message: details.message || "",
        availableFrom: details.availableFrom || "",
        availableUntil: details.availableUntil || "",
        workHours: {
          start: details.workHours?.start || "09:00",
          end: details.workHours?.end || "17:00",
        },
        workDays: details.workDays || [1, 2, 3, 4, 5],
      });
    }
  }, [dashboardData, form]);

  // Mutation for updating availability
  const updateAvailabilityMutation = useMutation({
    mutationFn: (data: AvailabilityFormValues) => {
      return apiRequest("/api/freelancer/availability", {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Availability updated",
        description: "Your availability has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/freelancer/dashboard"] });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Error updating availability",
        description: error.message || "There was an error updating your availability.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: AvailabilityFormValues) => {
    updateAvailabilityMutation.mutate(data);
  };

  const handleCancel = () => {
    setLocation("/");
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={handleCancel}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="bg-gradient-to-r from-primary/20 to-primary/10">
          <CardTitle className="text-xl font-bold">Update Availability</CardTitle>
          <CardDescription>
            Set your current availability status and working hours
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Availability Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your availability status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="available">Available for work</SelectItem>
                        <SelectItem value="limited">Limited availability</SelectItem>
                        <SelectItem value="unavailable">Not available</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Availability Message (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add a custom message about your availability"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="availableFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Available From (Optional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="date"
                            {...field}
                          />
                          <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="availableUntil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Available Until (Optional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="date"
                            {...field}
                          />
                          <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Working Hours</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="workHours.start"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="time"
                              {...field}
                            />
                            <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="workHours.end"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="time"
                              {...field}
                            />
                            <Clock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="workDays"
                  render={() => (
                    <FormItem>
                      <div className="mb-2">
                        <FormLabel>Working Days</FormLabel>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {dayNames.map((day) => (
                          <FormField
                            key={day.value}
                            control={form.control}
                            name="workDays"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={day.value}
                                  className="flex flex-row items-center space-x-1 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(day.value)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, day.value])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== day.value
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal">
                                    {day.label}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <CardFooter className="px-0 pt-4 flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateAvailabilityMutation.isPending}
                >
                  {updateAvailabilityMutation.isPending ? "Updating..." : "Update Availability"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}