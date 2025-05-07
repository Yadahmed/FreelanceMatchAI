import { 
  User, InsertUser, 
  Freelancer, InsertFreelancer,
  Chat, InsertChat,
  Message, InsertMessage,
  JobRequest, InsertJobRequest,
  Booking, InsertBooking,
  UserPreferences, InsertUserPreferences,
  Notification, InsertNotification,
  Review, InsertReview
} from "@shared/schema";

// Interface for storage methods
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  
  // Freelancer methods
  getFreelancer(id: number): Promise<Freelancer | undefined>;
  getFreelancerByUserId(userId: number): Promise<Freelancer | undefined>;
  createFreelancer(freelancer: InsertFreelancer): Promise<Freelancer>;
  updateFreelancer(id: number, freelancer: Partial<InsertFreelancer>): Promise<Freelancer>;
  getAllFreelancers(): Promise<Freelancer[]>;
  getFreelancersByProfession(profession: string): Promise<Freelancer[]>;
  getFreelancersByLocation(location: string): Promise<Freelancer[]>;
  getFreelancersBySkill(skill: string): Promise<Freelancer[]>;
  getTopFreelancersByRanking(limit: number): Promise<Freelancer[]>;
  
  // Chat methods
  getChat(id: number): Promise<Chat | undefined>;
  getChatsByUserId(userId: number): Promise<Chat[]>;
  createChat(chat: InsertChat): Promise<Chat>;
  
  // Message methods
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesByChatId(chatId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Job request methods
  getJobRequest(id: number): Promise<JobRequest | undefined>;
  getJobRequestsByClientId(clientId: number): Promise<JobRequest[]>;
  getJobRequestsByFreelancerId(freelancerId: number): Promise<JobRequest[]>;
  createJobRequest(jobRequest: InsertJobRequest): Promise<JobRequest>;
  updateJobRequestStatus(id: number, status: string): Promise<JobRequest>;
  
  // Booking methods
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingsByFreelancerId(freelancerId: number): Promise<Booking[]>;
  getBookingsByClientId(clientId: number): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: number, status: string): Promise<Booking>;
  
  // User preferences methods
  getUserPreferences(userId: number): Promise<UserPreferences | undefined>;
  createOrUpdateUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;
  
  // Notification methods
  getNotifications(userId: number): Promise<Notification[]>;
  getUnreadNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification>;
  
  // Review methods
  getReviewsByFreelancerId(freelancerId: number): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private freelancers: Map<number, Freelancer>;
  private chats: Map<number, Chat>;
  private messages: Map<number, Message>;
  private currentUserId: number;
  private currentFreelancerId: number;
  private currentChatId: number;
  private currentMessageId: number;

  constructor() {
    this.users = new Map();
    this.freelancers = new Map();
    this.chats = new Map();
    this.messages = new Map();
    this.currentUserId = 1;
    this.currentFreelancerId = 1;
    this.currentChatId = 1;
    this.currentMessageId = 1;
    
    // Initialize with some example freelancers
    this.initializeSampleFreelancers();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }
  
  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.firebaseUid === firebaseUid,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const now = new Date();
    const user: User = { 
      id,
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email,
      displayName: insertUser.displayName || null,
      photoURL: insertUser.photoURL || null,
      firebaseUid: insertUser.firebaseUid || null,
      isClient: insertUser.isClient !== undefined ? insertUser.isClient : true,
      createdAt: now,
      lastLogin: now
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error(`User with id ${id} not found`);
    
    const updatedUser: User = {
      ...user,
      ...userData,
      lastLogin: new Date()
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Freelancer methods
  async getFreelancer(id: number): Promise<Freelancer | undefined> {
    return this.freelancers.get(id);
  }
  
  async getFreelancerByUserId(userId: number): Promise<Freelancer | undefined> {
    return Array.from(this.freelancers.values()).find(
      (freelancer) => freelancer.userId === userId,
    );
  }

  async createFreelancer(insertFreelancer: InsertFreelancer): Promise<Freelancer> {
    const id = this.currentFreelancerId++;
    const freelancer: Freelancer = { 
      id,
      userId: insertFreelancer.userId,
      profession: insertFreelancer.profession,
      skills: insertFreelancer.skills,
      bio: insertFreelancer.bio,
      hourlyRate: insertFreelancer.hourlyRate,
      location: insertFreelancer.location,
      rating: 0,
      jobPerformance: 0, 
      skillsExperience: 0,
      responsiveness: 0,
      fairnessScore: 0, 
      completedJobs: 0,
      yearsOfExperience: insertFreelancer.yearsOfExperience || null,
      timeZone: insertFreelancer.timeZone || null,
      availability: insertFreelancer.availability !== undefined ? insertFreelancer.availability : true,
      portfolioLinks: insertFreelancer.portfolioLinks || [],
      websiteUrl: insertFreelancer.websiteUrl || null,
      imageUrl: insertFreelancer.imageUrl || null
    };
    this.freelancers.set(id, freelancer);
    return freelancer;
  }
  
  async updateFreelancer(id: number, freelancerData: Partial<InsertFreelancer>): Promise<Freelancer> {
    const freelancer = await this.getFreelancer(id);
    if (!freelancer) throw new Error(`Freelancer with id ${id} not found`);
    
    const updatedFreelancer: Freelancer = {
      ...freelancer,
      ...freelancerData,
      // Ensure type consistency
      yearsOfExperience: freelancerData.yearsOfExperience ?? freelancer.yearsOfExperience,
      timeZone: freelancerData.timeZone ?? freelancer.timeZone,
      portfolioLinks: freelancerData.portfolioLinks ?? freelancer.portfolioLinks,
      websiteUrl: freelancerData.websiteUrl ?? freelancer.websiteUrl,
      imageUrl: freelancerData.imageUrl ?? freelancer.imageUrl
    };
    
    this.freelancers.set(id, updatedFreelancer);
    return updatedFreelancer;
  }
  
  async getAllFreelancers(): Promise<Freelancer[]> {
    return Array.from(this.freelancers.values());
  }
  
  async getFreelancersByProfession(profession: string): Promise<Freelancer[]> {
    return Array.from(this.freelancers.values()).filter(
      (freelancer) => freelancer.profession.toLowerCase().includes(profession.toLowerCase()),
    );
  }
  
  async getFreelancersByLocation(location: string): Promise<Freelancer[]> {
    return Array.from(this.freelancers.values()).filter(
      (freelancer) => freelancer.location.toLowerCase().includes(location.toLowerCase()),
    );
  }
  
  async getFreelancersBySkill(skill: string): Promise<Freelancer[]> {
    return Array.from(this.freelancers.values()).filter(
      (freelancer) => freelancer.skills.some(s => s.toLowerCase().includes(skill.toLowerCase())),
    );
  }
  
  async getTopFreelancersByRanking(limit: number): Promise<Freelancer[]> {
    // Calculate overall ranking based on the algorithm weights
    // Job Performance 50%, Skills & Experience 20%, Responsiveness & Availability 15%, Fairness Boost 15%
    const rankedFreelancers = Array.from(this.freelancers.values()).map(freelancer => {
      const ranking = (
        (freelancer.jobPerformance * 0.5) +
        (freelancer.skillsExperience * 0.2) +
        (freelancer.responsiveness * 0.15) +
        (freelancer.fairnessScore * 0.15)
      );
      return { ...freelancer, ranking };
    });
    
    // Sort by ranking (highest first) and limit the results
    return rankedFreelancers
      .sort((a, b) => (b.ranking || 0) - (a.ranking || 0))
      .slice(0, limit);
  }

  // Chat methods
  async getChat(id: number): Promise<Chat | undefined> {
    return this.chats.get(id);
  }
  
  async getChatsByUserId(userId: number): Promise<Chat[]> {
    return Array.from(this.chats.values()).filter(
      (chat) => chat.userId === userId,
    );
  }
  
  async createChat(insertChat: InsertChat): Promise<Chat> {
    const id = this.currentChatId++;
    const now = new Date();
    const chat: Chat = { 
      ...insertChat, 
      id, 
      createdAt: now, 
      updated_at: now 
    };
    this.chats.set(id, chat);
    return chat;
  }

  // Message methods
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }
  
  async getMessagesByChatId(chatId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((message) => message.chatId === chatId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
  
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const message: Message = { 
      ...insertMessage, 
      id, 
      timestamp: new Date(),
      // Ensure freelancerResults is not undefined
      freelancerResults: insertMessage.freelancerResults || null
    };
    this.messages.set(id, message);
    
    // Update chat's updated_at time
    const chat = this.chats.get(message.chatId);
    if (chat) {
      chat.updated_at = new Date();
      this.chats.set(chat.id, chat);
    }
    
    return message;
  }

  // Initialize with sample freelancers for testing
  private initializeSampleFreelancers() {
    const sampleFreelancers: InsertFreelancer[] = [
      {
        userId: 1,
        profession: "Event Photographer",
        skills: ["Corporate Events", "Portrait", "Product"],
        bio: "8 years experience specializing in corporate events and conferences in the Middle East region.",
        hourlyRate: 30,
        jobPerformance: 95,
        skillsExperience: 90,
        responsiveness: 88,
        fairnessScore: 85,
        completedJobs: 124,
        location: "Erbil, Iraq",
        availability: true,
        portfolioLinks: ["https://portfolio.example.com/sarah"],
        imageUrl: "https://images.unsplash.com/photo-1554048612-b6a482bc67e5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
      },
      {
        userId: 2,
        profession: "Commercial Photographer",
        skills: ["Events", "Commercial", "Editorial"],
        bio: "Experienced photographer based in Erbil with 5+ years specializing in commercial and corporate photography.",
        hourlyRate: 28,
        jobPerformance: 92,
        skillsExperience: 85,
        responsiveness: 90,
        fairnessScore: 75,
        completedJobs: 87,
        location: "Erbil, Iraq",
        availability: true,
        portfolioLinks: ["https://portfolio.example.com/mohammad"],
        imageUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
      },
      {
        userId: 3,
        profession: "Documentary Photographer",
        skills: ["Documentary", "Events", "Journalism"],
        bio: "Documentary photographer with excellent storytelling skills. Experienced in corporate event documentation.",
        hourlyRate: 25,
        jobPerformance: 85,
        skillsExperience: 80,
        responsiveness: 78,
        fairnessScore: 82,
        completedJobs: 65,
        location: "Erbil, Iraq",
        availability: true,
        portfolioLinks: ["https://portfolio.example.com/leyla"],
        imageUrl: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
      },
      {
        userId: 4,
        profession: "Web Developer",
        skills: ["React", "Node.js", "Frontend", "JavaScript"],
        bio: "Full-stack developer with 6 years experience building responsive web applications with React and Node.js.",
        hourlyRate: 45,
        jobPerformance: 90,
        skillsExperience: 88,
        responsiveness: 85,
        fairnessScore: 90,
        completedJobs: 112,
        location: "Remote",
        availability: true,
        portfolioLinks: ["https://portfolio.example.com/alex"],
        imageUrl: "https://images.unsplash.com/photo-1580927752452-89d86da3fa0a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
      },
      {
        userId: 5,
        profession: "Graphic Designer",
        skills: ["Branding", "UI/UX", "Logo Design", "Adobe Suite"],
        bio: "Creative graphic designer with a strong portfolio in branding, logo design, and digital assets creation.",
        hourlyRate: 35,
        jobPerformance: 88,
        skillsExperience: 92,
        responsiveness: 80,
        fairnessScore: 85,
        completedJobs: 95,
        location: "Remote",
        availability: true,
        portfolioLinks: ["https://portfolio.example.com/lisa"],
        imageUrl: "https://images.unsplash.com/photo-1581078426770-6d336e5de7bf?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
      }
    ];

    sampleFreelancers.forEach(freelancer => {
      const id = this.currentFreelancerId++;
      this.freelancers.set(id, { 
        id,
        userId: freelancer.userId,
        profession: freelancer.profession,
        skills: freelancer.skills,
        bio: freelancer.bio,
        hourlyRate: freelancer.hourlyRate,
        location: freelancer.location,
        rating: freelancer.rating || 0,
        jobPerformance: freelancer.jobPerformance || 0,
        skillsExperience: freelancer.skillsExperience || 0,
        responsiveness: freelancer.responsiveness || 0,
        fairnessScore: freelancer.fairnessScore || 0,
        completedJobs: freelancer.completedJobs || 0,
        yearsOfExperience: freelancer.yearsOfExperience || null,
        timeZone: freelancer.timeZone || null,
        availability: freelancer.availability || true,
        portfolioLinks: freelancer.portfolioLinks || [],
        websiteUrl: freelancer.websiteUrl || null,
        imageUrl: freelancer.imageUrl || null
      });
    });
  }
}

// Database storage implementation
import { db } from './db';
import { eq, desc, sql, and, like, ilike, or } from 'drizzle-orm';
import * as schema from '@shared/schema';

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return user;
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.firebaseUid, firebaseUid));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(schema.users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(schema.users)
      .set({ ...userData, lastLogin: new Date() })
      .where(eq(schema.users.id, id))
      .returning();
    return user;
  }

  // Freelancer methods
  async getFreelancer(id: number): Promise<Freelancer | undefined> {
    const [freelancer] = await db.select().from(schema.freelancers).where(eq(schema.freelancers.id, id));
    return freelancer;
  }

  async getFreelancerByUserId(userId: number): Promise<Freelancer | undefined> {
    const [freelancer] = await db.select().from(schema.freelancers).where(eq(schema.freelancers.userId, userId));
    return freelancer;
  }

  async createFreelancer(insertFreelancer: InsertFreelancer): Promise<Freelancer> {
    const [freelancer] = await db.insert(schema.freelancers).values(insertFreelancer).returning();
    return freelancer;
  }

  async updateFreelancer(id: number, freelancerData: Partial<InsertFreelancer>): Promise<Freelancer> {
    const [freelancer] = await db
      .update(schema.freelancers)
      .set(freelancerData)
      .where(eq(schema.freelancers.id, id))
      .returning();
    return freelancer;
  }

  async getAllFreelancers(): Promise<Freelancer[]> {
    return await db.select().from(schema.freelancers);
  }

  async getFreelancersByProfession(profession: string): Promise<Freelancer[]> {
    return await db
      .select()
      .from(schema.freelancers)
      .where(ilike(schema.freelancers.profession, `%${profession}%`));
  }

  async getFreelancersByLocation(location: string): Promise<Freelancer[]> {
    return await db
      .select()
      .from(schema.freelancers)
      .where(ilike(schema.freelancers.location, `%${location}%`));
  }

  async getFreelancersBySkill(skill: string): Promise<Freelancer[]> {
    // This is a simplified approach. A more robust solution would use a join table for skills
    // or implement a contains operator specific to arrays
    return await db
      .select()
      .from(schema.freelancers)
      .where(sql`${schema.freelancers.skills}::text[] @> ARRAY[${skill}]::text[]`);
  }

  async getTopFreelancersByRanking(limit: number): Promise<Freelancer[]> {
    // Calculate the ranking score using SQL expressions
    const rankingScoreQuery = sql`
      (${schema.freelancers.jobPerformance} * 0.5) +
      (${schema.freelancers.skillsExperience} * 0.2) +
      (${schema.freelancers.responsiveness} * 0.15) +
      (${schema.freelancers.fairnessScore} * 0.15)
    `;

    const freelancers = await db
      .select({
        ...schema.freelancers,
        ranking: rankingScoreQuery
      })
      .from(schema.freelancers)
      .orderBy(desc(rankingScoreQuery))
      .limit(limit);

    return freelancers;
  }

  // Chat methods
  async getChat(id: number): Promise<Chat | undefined> {
    const [chat] = await db.select().from(schema.chats).where(eq(schema.chats.id, id));
    return chat;
  }

  async getChatsByUserId(userId: number): Promise<Chat[]> {
    return await db
      .select()
      .from(schema.chats)
      .where(eq(schema.chats.userId, userId))
      .orderBy(desc(schema.chats.updated_at));
  }

  async createChat(insertChat: InsertChat): Promise<Chat> {
    const [chat] = await db.insert(schema.chats).values(insertChat).returning();
    return chat;
  }

  // Message methods
  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(schema.messages).where(eq(schema.messages.id, id));
    return message;
  }

  async getMessagesByChatId(chatId: number): Promise<Message[]> {
    return await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.chatId, chatId))
      .orderBy(schema.messages.timestamp);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    // Start a transaction
    return await db.transaction(async (tx) => {
      // Create the message
      const [message] = await tx.insert(schema.messages).values(insertMessage).returning();

      // Update the chat's updated_at timestamp
      await tx
        .update(schema.chats)
        .set({ updated_at: new Date() })
        .where(eq(schema.chats.id, message.chatId));

      return message;
    });
  }

  // Job request methods
  async getJobRequest(id: number): Promise<JobRequest | undefined> {
    const [jobRequest] = await db.select().from(schema.jobRequests).where(eq(schema.jobRequests.id, id));
    return jobRequest;
  }

  async getJobRequestsByClientId(clientId: number): Promise<JobRequest[]> {
    return await db
      .select()
      .from(schema.jobRequests)
      .where(eq(schema.jobRequests.clientId, clientId))
      .orderBy(desc(schema.jobRequests.createdAt));
  }

  async getJobRequestsByFreelancerId(freelancerId: number): Promise<JobRequest[]> {
    return await db
      .select()
      .from(schema.jobRequests)
      .where(eq(schema.jobRequests.freelancerId, freelancerId))
      .orderBy(desc(schema.jobRequests.createdAt));
  }

  async createJobRequest(jobRequest: InsertJobRequest): Promise<JobRequest> {
    const [createdJobRequest] = await db.insert(schema.jobRequests).values(jobRequest).returning();
    return createdJobRequest;
  }

  async updateJobRequestStatus(id: number, status: string): Promise<JobRequest> {
    const [jobRequest] = await db
      .update(schema.jobRequests)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(schema.jobRequests.id, id))
      .returning();
    return jobRequest;
  }

  // Booking methods
  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, id));
    return booking;
  }

  async getBookingsByFreelancerId(freelancerId: number): Promise<Booking[]> {
    return await db
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.freelancerId, freelancerId))
      .orderBy(schema.bookings.date, schema.bookings.startTime);
  }

  async getBookingsByClientId(clientId: number): Promise<Booking[]> {
    return await db
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.clientId, clientId))
      .orderBy(schema.bookings.date, schema.bookings.startTime);
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [createdBooking] = await db.insert(schema.bookings).values(booking).returning();
    return createdBooking;
  }

  async updateBookingStatus(id: number, status: string): Promise<Booking> {
    const [booking] = await db
      .update(schema.bookings)
      .set({ status })
      .where(eq(schema.bookings.id, id))
      .returning();
    return booking;
  }

  // User preferences methods
  async getUserPreferences(userId: number): Promise<UserPreferences | undefined> {
    const [preferences] = await db
      .select()
      .from(schema.userPreferences)
      .where(eq(schema.userPreferences.userId, userId));
    return preferences;
  }

  async createOrUpdateUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences> {
    // Check if preferences exist for this user
    const existingPreferences = await this.getUserPreferences(preferences.userId);

    if (existingPreferences) {
      // Update existing preferences
      const [updated] = await db
        .update(schema.userPreferences)
        .set({
          ...preferences,
          updatedAt: new Date()
        })
        .where(eq(schema.userPreferences.userId, preferences.userId))
        .returning();
      return updated;
    } else {
      // Create new preferences
      const [created] = await db.insert(schema.userPreferences).values(preferences).returning();
      return created;
    }
  }

  // Notification methods
  async getNotifications(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, userId))
      .orderBy(desc(schema.notifications.createdAt));
  }

  async getUnreadNotifications(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(schema.notifications)
      .where(and(
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.isRead, false)
      ))
      .orderBy(desc(schema.notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(schema.notifications).values(notification).returning();
    return created;
  }

  async markNotificationAsRead(id: number): Promise<Notification> {
    const [notification] = await db
      .update(schema.notifications)
      .set({ isRead: true })
      .where(eq(schema.notifications.id, id))
      .returning();
    return notification;
  }

  // Review methods
  async getReviewsByFreelancerId(freelancerId: number): Promise<Review[]> {
    return await db
      .select()
      .from(schema.reviews)
      .where(eq(schema.reviews.freelancerId, freelancerId))
      .orderBy(desc(schema.reviews.createdAt));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [created] = await db.insert(schema.reviews).values(review).returning();
    return created;
  }
}

// We'll use the DatabaseStorage implementation for production
export const storage = new DatabaseStorage();
