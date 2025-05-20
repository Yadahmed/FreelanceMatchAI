import { Request, Response } from 'express';
import { db } from '../db';
import { jobRequests, freelancers, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export async function createJobRequest(req: Request, res: Response) {
  try {
    const { freelancerId, title, description, budget, skills } = req.body;
    
    if (!req.user || !req.user.isClient) {
      return res.status(403).json({ message: 'Only clients can create job requests' });
    }
    
    const clientId = req.user.id;
    
    // Validate required fields
    if (!freelancerId || !title || !description) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if freelancer exists
    const [freelancer] = await db
      .select()
      .from(freelancers)
      .where(eq(freelancers.id, freelancerId));
      
    if (!freelancer) {
      return res.status(404).json({ message: 'Freelancer not found' });
    }
    
    // Create the job request
    const [jobRequest] = await db
      .insert(jobRequests)
      .values({
        clientId,
        freelancerId,
        title,
        description,
        budget: budget || null,
        skills: skills || [],
        status: 'pending',
      })
      .returning();
    
    return res.status(201).json({ 
      message: 'Job request created successfully', 
      jobRequest 
    });
    
  } catch (error) {
    console.error('Error creating job request:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getClientJobRequests(req: Request, res: Response) {
  try {
    if (!req.user || !req.user.isClient) {
      return res.status(403).json({ message: 'Only clients can view their job requests' });
    }
    
    const clientId = req.user.id;
    
    // Get all job requests for this client with freelancer details
    const jobRequestsList = await db.query.jobRequests.findMany({
      where: eq(jobRequests.clientId, clientId),
      with: {
        freelancer: {
          with: {
            user: true
          }
        }
      },
      orderBy: (jobRequests, { desc }) => [desc(jobRequests.createdAt)]
    });
    
    // Format the response
    const formattedJobRequests = jobRequestsList.map(request => {
      const { freelancer, ...jobRequest } = request;
      
      return {
        ...jobRequest,
        freelancer: {
          id: freelancer.id,
          userId: freelancer.userId,
          profession: freelancer.profession,
          skills: freelancer.skills,
          location: freelancer.location,
          imageUrl: freelancer.imageUrl,
          rating: freelancer.rating,
          availability: freelancer.availability,
          availabilityDetails: freelancer.availabilityDetails,
        }
      };
    });
    
    return res.json({ jobRequests: formattedJobRequests });
    
  } catch (error) {
    console.error('Error fetching client job requests:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getFreelancerJobRequests(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Find the freelancer profile associated with this user
    const [freelancerProfile] = await db
      .select()
      .from(freelancers)
      .where(eq(freelancers.userId, req.user.id));
    
    if (!freelancerProfile) {
      return res.status(403).json({ message: 'You do not have a freelancer profile' });
    }
    
    console.log(`Getting job requests for freelancer ID: ${freelancerProfile.id}`);
    
    // Get all job requests for this freelancer
    const requestsList = await db
      .select()
      .from(jobRequests)
      .where(eq(jobRequests.freelancerId, freelancerProfile.id))
      .orderBy(jobRequests.createdAt);
    
    console.log(`Found ${requestsList.length} job requests`);
    
    // Process and enhance job requests with client information
    console.log(`About to process ${requestsList.length} job requests with client data`);
    
    const enhancedRequests = await Promise.all(
      requestsList.map(async (request) => {
        console.log(`Processing job request ID ${request.id} for client ID ${request.clientId}`);
        
        // For each job request, get the client info
        const [client] = await db
          .select()
          .from(users)
          .where(eq(users.id, request.clientId));
          
        console.log(`Client lookup for job request ${request.id}:`, 
          client ? `Found: ${client.username} (${client.id})` : `Not found for client ID ${request.clientId}`);
        
        // Return enhanced request with client data
        return {
          ...request,
          client: client ? {
            id: client.id,
            username: client.username,
            displayName: client.displayName || client.username,
            email: client.email
          } : {
            id: request.clientId,
            username: `user_${request.clientId}`,
            displayName: `Client ${request.clientId}`
          }
        };
      })
    );
    
    return res.json({ jobRequests: enhancedRequests });
  } catch (error) {
    console.error('Error fetching freelancer job requests:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function updateJobRequestStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    if (!status || !['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    // Find the freelancer profile associated with this user
    const [freelancerProfile] = await db
      .select()
      .from(freelancers)
      .where(eq(freelancers.userId, req.user.id));
    
    if (!freelancerProfile) {
      return res.status(403).json({ message: 'You do not have a freelancer profile' });
    }
    
    // Check if the job request exists and belongs to this freelancer
    const [jobRequest] = await db
      .select()
      .from(jobRequests)
      .where(
        and(
          eq(jobRequests.id, parseInt(id)),
          eq(jobRequests.freelancerId, freelancerProfile.id)
        )
      );
    
    if (!jobRequest) {
      return res.status(404).json({ message: 'Job request not found or does not belong to you' });
    }
    
    // Update the job request status
    const [updatedJobRequest] = await db
      .update(jobRequests)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(jobRequests.id, parseInt(id)))
      .returning();
    
    return res.json({ 
      message: `Job request ${status} successfully`, 
      jobRequest: updatedJobRequest
    });
    
  } catch (error) {
    console.error('Error updating job request status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Mark a job request as completed and update freelancer metrics
 */
export async function completeJobRequest(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Log the request for debugging
    console.log(`Job completion request for job ID: ${id} by user ${req.user.id}`);
    
    // Find the freelancer profile associated with this user
    const [freelancerProfile] = await db
      .select()
      .from(freelancers)
      .where(eq(freelancers.userId, req.user.id));
    
    if (!freelancerProfile) {
      console.log('Freelancer profile not found for user:', req.user.id);
      return res.status(403).json({ message: 'You do not have a freelancer profile' });
    }
    
    console.log(`Found freelancer profile ID: ${freelancerProfile.id}`);
    
    // Check if the job request exists and belongs to this freelancer
    let jobRequest;
    
    try {
      // Try parsing the ID as a number
      const jobId = parseInt(id);
      if (isNaN(jobId)) {
        console.log(`Invalid job ID format: ${id}`);
        return res.status(400).json({ message: 'Invalid job ID format' });
      }
      
      [jobRequest] = await db
        .select()
        .from(jobRequests)
        .where(
          and(
            eq(jobRequests.id, jobId),
            eq(jobRequests.freelancerId, freelancerProfile.id)
          )
        );
    } catch (dbError) {
      console.error('Error querying job request:', dbError);
      return res.status(500).json({ message: 'Database error when looking up job request' });
    }
    
    // Job not found or doesn't belong to this freelancer
    if (!jobRequest) {
      console.log(`Job request ${id} not found or does not belong to freelancer ${freelancerProfile.id}`);
      return res.status(404).json({ 
        message: 'Job request not found or does not belong to you' 
      });
    }
    
    console.log(`Found job request: ID=${jobRequest.id}, Status=${jobRequest.status}`);
    
    // Check job status constraints
    if (jobRequest.status === 'declined') {
      return res.status(400).json({
        message: 'This job cannot be completed because it was declined'
      });
    }
    
    if (jobRequest.status === 'completed') {
      return res.status(200).json({
        success: true,
        message: 'This job was already marked as completed',
        alreadyCompleted: true
      });
    }
    
    // If we get here, the job can be completed. Update its status.
    let updatedJobRequest;
    try {
      [updatedJobRequest] = await db
        .update(jobRequests)
        .set({ 
          status: 'completed',
          updatedAt: new Date()
        })
        .where(eq(jobRequests.id, jobRequest.id))
        .returning();
      
      console.log(`Updated job request ${jobRequest.id} status to completed`);
    } catch (updateError) {
      console.error('Error updating job request status:', updateError);
      return res.status(500).json({ message: 'Error updating job status' });
    }
    
    // Calculate performance metrics updates
    const updatedCompletedJobs = (freelancerProfile.completedJobs || 0) + 1;
    const currentStreak = (freelancerProfile.consecutiveCompletions || 0) + 1;
    
    // Calculate performance boost based on streak
    let performanceBoost = 0.15; // Base 15% for first completion
    if (currentStreak === 2) {
        performanceBoost = 0.18; // 18% for second consecutive completion
    } else if (currentStreak >= 3) {
        performanceBoost = 0.20; // 20% for third or more consecutive completion
    }
    
    console.log(`Applying completion streak bonus: ${performanceBoost * 100}% (streak: ${currentStreak})`);
    
    // Make sure values are between 0 and 1 for all metrics
    const updatedJobPerformance = Math.min(1.0, (freelancerProfile.jobPerformance || 0) + performanceBoost);
    const updatedResponsiveness = Math.min(1.0, (freelancerProfile.responsiveness || 0) + 0.05);
    
    // Update the freelancer record with new metrics
    try {
      // Make sure we're using the right data types
      const completedJobsInt = Math.round(updatedCompletedJobs);
      const consecutiveCompletionsInt = Math.round(currentStreak);
      const jobPerformanceFloat = parseFloat(updatedJobPerformance.toFixed(2));
      const responsivenessFloat = parseFloat(updatedResponsiveness.toFixed(2));
      
      console.log(`Updating freelancer metrics with: completedJobs=${completedJobsInt} (${typeof completedJobsInt}), streak=${consecutiveCompletionsInt} (${typeof consecutiveCompletionsInt})`);
      console.log(`Performance metrics: jobPerformance=${jobPerformanceFloat} (${typeof jobPerformanceFloat}), responsiveness=${responsivenessFloat} (${typeof responsivenessFloat})`);
      
      await db
        .update(freelancers)
        .set({ 
          completedJobs: completedJobsInt,
          consecutiveCompletions: consecutiveCompletionsInt,
          jobPerformance: jobPerformanceFloat, 
          responsiveness: responsivenessFloat
        })
        .where(eq(freelancers.id, freelancerProfile.id));
      
      console.log(`Updated freelancer ${freelancerProfile.id} metrics: completedJobs=${completedJobsInt}, streak=${consecutiveCompletionsInt}`);
    } catch (updateError) {
      console.error('Error updating freelancer metrics:', updateError);
      // Don't fail the whole request if updating metrics fails
      // We'll just log the error but still return success for the job completion
    }
    
    // Return a simple plain response without complex objects
    return res.status(200).json({
      success: true,
      message: 'Job completed successfully',
      streak: currentStreak,
      performanceBoost: `+${Math.round(performanceBoost * 100)}%`
    });
    
  } catch (error) {
    console.error('Error completing job request:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: String(error)
    });
  }
}

/**
 * Handle a freelancer quitting a job (with penalties to their match score)
 */
/**
 * Handle a freelancer quitting a job (with penalties to their match score)
 */
export async function quitJobRequest(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Find the freelancer profile associated with this user
    const [freelancerProfile] = await db
      .select()
      .from(freelancers)
      .where(eq(freelancers.userId, req.user.id));
    
    if (!freelancerProfile) {
      return res.status(403).json({ message: 'You do not have a freelancer profile' });
    }
    
    // Check if the job request exists, is accepted, and belongs to this freelancer
    const [jobRequest] = await db
      .select()
      .from(jobRequests)
      .where(
        and(
          eq(jobRequests.id, parseInt(id)),
          eq(jobRequests.freelancerId, freelancerProfile.id)
        )
      );
    
    if (!jobRequest) {
      return res.status(404).json({ message: 'Job request not found or does not belong to you' });
    }
    
    if (jobRequest.status !== 'accepted') {
      return res.status(400).json({ message: 'You can only quit jobs that you have accepted' });
    }
    
    // Update the job request status to declined (since it was quit)
    const [updatedJobRequest] = await db
      .update(jobRequests)
      .set({ 
        status: 'declined',
        updatedAt: new Date()
      })
      .where(eq(jobRequests.id, parseInt(id)))
      .returning();
    
    // Apply a flat 20% penalty to job performance score and reset streak
    const penaltyAmount = 0.20; // 20% match score penalty
    
    console.log(`Applying quit penalty: -${penaltyAmount * 100}% and resetting streak`);
    
    // Calculate new values ensuring proper data types
    const newJobPerformance = parseFloat(Math.max(0, (freelancerProfile.jobPerformance || 0) - penaltyAmount).toFixed(2));
    const newFairnessScore = parseFloat(Math.max(0, (freelancerProfile.fairnessScore || 0) - 0.05).toFixed(2));
    const newResponsiveness = parseFloat(Math.max(0, (freelancerProfile.responsiveness || 0) - 0.05).toFixed(2));
    
    console.log(`New metrics after penalty: jobPerformance=${newJobPerformance}, fairnessScore=${newFairnessScore}, responsiveness=${newResponsiveness}`);
    
    // Make sure values are between 0 and 1 for all metrics
    await db
      .update(freelancers)
      .set({ 
        // Apply 20% penalty to job performance (on a 0-1 scale)
        jobPerformance: newJobPerformance,
        // Decrease fairness score slightly
        fairnessScore: newFairnessScore,
        // Also decrease responsiveness slightly
        responsiveness: newResponsiveness,
        // Reset the consecutive completions streak to 0
        consecutiveCompletions: 0
      })
      .where(eq(freelancers.id, freelancerProfile.id));
    
    return res.json({ 
      message: 'Job request has been cancelled. Your match score has been reduced by 20% and your completion streak has been reset.',
      jobRequest: updatedJobRequest
    });
    
  } catch (error) {
    console.error('Error quitting job request:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}