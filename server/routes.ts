import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import apiRouter from './routes/api';
import * as chatController from './controllers/chatController';
import { authenticateUser } from './middleware/auth';

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply API routes
  app.use("/api", apiRouter);

  // For backwards compatibility, keep the old chat-message endpoint
  app.post("/api/chat-message", authenticateUser, chatController.sendMessage);

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error occurred:', err);
    
    if (err instanceof ZodError) {
      const validationError = fromZodError(err);
      return res.status(400).json({ 
        message: "Validation Error", 
        errors: validationError.toString() 
      });
    }
    
    res.status(500).json({ message: "Internal Server Error" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
