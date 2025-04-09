import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { chatRequestSchema, insertUserSchema } from "@shared/schema";
import { z, ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import admin from "firebase-admin";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Firebase Admin if credentials are available
  try {
    const firebaseCredentials = process.env.FIREBASE_CREDENTIALS;
    if (firebaseCredentials) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(firebaseCredentials)),
      });
    } else {
      console.warn("Firebase credentials not provided, authentication will be limited");
    }
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error);
  }

  // Middleware for Firebase token verification
  const verifyFirebaseToken = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const idToken = req.headers.authorization?.split('Bearer ')[1];
      if (!idToken) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
      }

      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.body.firebaseUid = decodedToken.uid;
        next();
      } catch (error) {
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
      }
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error during authentication' });
    }
  };

  // API routes with /api prefix
  const apiRouter = express.Router();
  app.use("/api", apiRouter);

  // User routes
  apiRouter.post("/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(userData.email);
      
      if (existingUser) {
        return res.status(409).json({ message: "User with this email already exists" });
      }
      
      const newUser = await storage.createUser(userData);
      res.status(201).json(newUser);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.format() });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  apiRouter.get("/users/me", verifyFirebaseToken, async (req, res) => {
    try {
      const user = await storage.getUserByFirebaseUid(req.body.firebaseUid);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Freelancer routes
  apiRouter.get("/freelancers", async (req, res) => {
    try {
      const freelancers = await storage.getAllFreelancers();
      res.json(freelancers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch freelancers" });
    }
  });

  apiRouter.get("/freelancers/top", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 3;
      const topFreelancers = await storage.getTopFreelancersByRanking(limit);
      res.json(topFreelancers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch top freelancers" });
    }
  });

  apiRouter.get("/freelancers/search", async (req, res) => {
    try {
      const { profession, location, skill } = req.query;
      let freelancers = [];
      
      if (profession) {
        freelancers = await storage.getFreelancersByProfession(profession as string);
      } else if (location) {
        freelancers = await storage.getFreelancersByLocation(location as string);
      } else if (skill) {
        freelancers = await storage.getFreelancersBySkill(skill as string);
      } else {
        freelancers = await storage.getAllFreelancers();
      }
      
      res.json(freelancers);
    } catch (error) {
      res.status(500).json({ message: "Failed to search freelancers" });
    }
  });

  // Chat routes
  apiRouter.post("/chats", verifyFirebaseToken, async (req, res) => {
    try {
      const user = await storage.getUserByFirebaseUid(req.body.firebaseUid);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const chat = await storage.createChat({ userId: user.id });
      res.status(201).json(chat);
    } catch (error) {
      res.status(500).json({ message: "Failed to create chat" });
    }
  });

  apiRouter.get("/chats", verifyFirebaseToken, async (req, res) => {
    try {
      const user = await storage.getUserByFirebaseUid(req.body.firebaseUid);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const chats = await storage.getChatsByUserId(user.id);
      res.json(chats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chats" });
    }
  });

  apiRouter.get("/chats/:id", verifyFirebaseToken, async (req, res) => {
    try {
      const chatId = parseInt(req.params.id);
      const chat = await storage.getChat(chatId);
      
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      
      const user = await storage.getUserByFirebaseUid(req.body.firebaseUid);
      if (!user || chat.userId !== user.id) {
        return res.status(403).json({ message: "Unauthorized access to chat" });
      }
      
      const messages = await storage.getMessagesByChatId(chatId);
      res.json({ chat, messages });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat" });
    }
  });

  // AI-powered freelancer matching endpoint
  apiRouter.post("/chat-message", async (req, res) => {
    try {
      const { message, chatId } = chatRequestSchema.parse(req.body);
      
      // Ensure chat exists
      const chat = chatId ? await storage.getChat(chatId) : null;
      if (chatId && !chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      
      // Create a new chat if needed
      const currentChatId = chat ? chat.id : (await storage.createChat({ userId: 1 })).id;
      
      // Save user message
      await storage.createMessage({
        chatId: currentChatId,
        content: message,
        isUserMessage: true,
        freelancerResults: null
      });
      
      // Parse the message to identify job requirements
      // This is a simple implementation - in a real app, would use more sophisticated NLP
      const messageWords = message.toLowerCase().split(/\s+/);
      
      // Extract possible profession keywords
      const professionKeywords = [
        "photographer", "developer", "designer", "writer", "translator",
        "marketer", "consultant", "teacher", "editor", "artist"
      ];
      
      // Look for profession keywords in the message
      const foundProfessions = professionKeywords.filter(keyword => 
        messageWords.includes(keyword));
      
      // Look for location keywords
      const locationKeywords = ["erbil", "remote", "local"];
      const foundLocations = locationKeywords.filter(keyword => 
        messageWords.includes(keyword));
      
      // Get matching freelancers based on identified criteria
      let matchedFreelancers = [];
      
      if (foundProfessions.length > 0) {
        matchedFreelancers = await storage.getFreelancersByProfession(foundProfessions[0]);
      } else if (foundLocations.length > 0) {
        matchedFreelancers = await storage.getFreelancersByLocation(foundLocations[0]);
      } else {
        // Default to top 3 freelancers
        matchedFreelancers = await storage.getTopFreelancersByRanking(3);
      }
      
      // Limit to top 3 and calculate match percentage
      const topFreelancers = matchedFreelancers
        .slice(0, 3)
        .map(freelancer => {
          // Calculate match score based on algorithm weights
          const matchScore = Math.min(
            Math.round(
              (freelancer.jobPerformance * 0.5) +
              (freelancer.skillsExperience * 0.2) +
              (freelancer.responsiveness * 0.15) +
              (freelancer.fairnessScore * 0.15)
            ),
            100
          );
          
          return {
            ...freelancer,
            matchPercentage: matchScore
          };
        });
      
      // Prepare AI response
      const botResponseText = `I've analyzed your request: "${message}" and found ${topFreelancers.length} freelancers that match your needs.`;
      
      // Save bot response to the chat
      const botMessage = await storage.createMessage({
        chatId: currentChatId,
        content: botResponseText,
        isUserMessage: false,
        freelancerResults: topFreelancers
      });
      
      res.json({
        chatId: currentChatId,
        message: botMessage,
        freelancers: topFreelancers
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid chat request", errors: error.format() });
      }
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
