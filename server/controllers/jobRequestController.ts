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
    const enhancedRequests = await Promise.all(
      requestsList.map(async (request) => {
        // For each job request, get the client info
        const [client] = await db
          .select()
          .from(users)
          .where(eq(users.id, request.clientId));
          
        console.log(`Client lookup for job request ${request.id}:`, 
          client ? `Found: ${client.username}` : 'Not found');
        
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
    const { jobRequestId } = req.params;
    const { status } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    if (!status || !['accepted', 'declined', 'completed'].includes(status)) {
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
          eq(jobRequests.id, parseInt(jobRequestId)),
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
      .where(eq(jobRequests.id, parseInt(jobRequestId)))
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