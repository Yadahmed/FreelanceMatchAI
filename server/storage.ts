import { 
  User, InsertUser, 
  Freelancer, InsertFreelancer,
  Chat, InsertChat,
  Message, InsertMessage 
} from "@shared/schema";

// Interface for storage methods
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Freelancer methods
  getFreelancer(id: number): Promise<Freelancer | undefined>;
  getFreelancerByUserId(userId: number): Promise<Freelancer | undefined>;
  createFreelancer(freelancer: InsertFreelancer): Promise<Freelancer>;
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
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
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
    const freelancer: Freelancer = { ...insertFreelancer, id };
    this.freelancers.set(id, freelancer);
    return freelancer;
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
      timestamp: new Date() 
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
      this.freelancers.set(id, { ...freelancer, id });
    });
  }
}

export const storage = new MemStorage();
