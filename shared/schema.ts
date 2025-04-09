import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  photoURL: text("photo_url"),
  firebaseUid: text("firebase_uid").unique(),
  isClient: boolean("is_client").notNull().default(true),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  displayName: true,
  photoURL: true,
  firebaseUid: true,
  isClient: true,
});

// Freelancers table
export const freelancers = pgTable("freelancers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  profession: text("profession").notNull(),
  skills: text("skills").array().notNull(),
  bio: text("bio").notNull(),
  hourlyRate: integer("hourly_rate").notNull(),
  rating: integer("rating").notNull().default(0),
  jobPerformance: integer("job_performance").notNull().default(0),
  skillsExperience: integer("skills_experience").notNull().default(0),
  responsiveness: integer("responsiveness").notNull().default(0),
  fairnessScore: integer("fairness_score").notNull().default(0),
  completedJobs: integer("completed_jobs").notNull().default(0),
  location: text("location").notNull(),
  availability: boolean("availability").notNull().default(true),
  portfolioLinks: text("portfolio_links").array(),
  imageUrl: text("image_url"),
});

export const insertFreelancerSchema = createInsertSchema(freelancers).pick({
  userId: true,
  profession: true,
  skills: true,
  bio: true,
  hourlyRate: true,
  jobPerformance: true,
  skillsExperience: true,
  responsiveness: true,
  fairnessScore: true,
  completedJobs: true,
  location: true,
  availability: true,
  portfolioLinks: true,
  imageUrl: true,
});

// Chat history
export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const insertChatSchema = createInsertSchema(chats).pick({
  userId: true,
});

// Chat messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull().references(() => chats.id),
  content: text("content").notNull(),
  isUserMessage: boolean("is_user_message").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  freelancerResults: json("freelancer_results"),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  chatId: true,
  content: true,
  isUserMessage: true,
  freelancerResults: true,
});

// Define types based on the schemas
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertFreelancer = z.infer<typeof insertFreelancerSchema>;
export type Freelancer = typeof freelancers.$inferSelect;

export type InsertChat = z.infer<typeof insertChatSchema>;
export type Chat = typeof chats.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Chat request schema for message sending
export const chatRequestSchema = z.object({
  message: z.string().min(1),
  chatId: z.number().optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
