import { pgTable, text, serial, integer, boolean, timestamp, json, date, time, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// AI Chat Messages table - for storing conversation history
export const aiChatMessages = pgTable("ai_chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").notNull(), // 'system', 'user', or 'assistant'
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  metadata: json("metadata"),
  conversationId: text("conversation_id").notNull(), // Group messages into conversations
});

export const insertAIChatMessageSchema = createInsertSchema(aiChatMessages).pick({
  userId: true,
  role: true,
  content: true,
  metadata: true,
  conversationId: true,
});

// AI Job Analysis table - for storing job analysis and matches
export const aiJobAnalyses = pgTable("ai_job_analyses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  jobRequestId: integer("job_request_id").references(() => jobRequests.id),
  analysis: json("analysis").notNull(),
  matches: json("matches").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  suggestedQuestions: json("suggested_questions"),
});

export const insertAIJobAnalysisSchema = createInsertSchema(aiJobAnalyses).pick({
  userId: true,
  jobRequestId: true,
  analysis: true,
  matches: true,
  suggestedQuestions: true,
});

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
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLogin: timestamp("last_login").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  displayName: true,
  photoURL: true,
  firebaseUid: true,
  isClient: true,
  isAdmin: true,
  lastLogin: true,
});

// Freelancers table - enhanced with years of experience
export const freelancers = pgTable("freelancers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  profession: text("profession").notNull(),
  skills: text("skills").array().notNull(),
  bio: text("bio").notNull(),
  hourlyRate: integer("hourly_rate").notNull(),
  yearsOfExperience: integer("years_of_experience").default(0),
  rating: integer("rating"), // Stored as integer where 45 = 4.5 stars; null means no rating yet
  jobPerformance: integer("job_performance").notNull().default(0),
  skillsExperience: integer("skills_experience").notNull().default(0),
  responsiveness: integer("responsiveness").notNull().default(0),
  fairnessScore: integer("fairness_score").notNull().default(0),
  completedJobs: integer("completed_jobs").notNull().default(0),
  location: text("location").notNull(),
  timeZone: text("time_zone"),
  availability: boolean("availability").notNull().default(true),
  portfolioLinks: text("portfolio_links").array(),
  websiteUrl: text("website_url"),
  imageUrl: text("image_url"),
});

export const insertFreelancerSchema = createInsertSchema(freelancers).pick({
  userId: true,
  profession: true,
  skills: true,
  bio: true,
  hourlyRate: true,
  yearsOfExperience: true,
  location: true,
  timeZone: true,
  availability: true,
  portfolioLinks: true,
  websiteUrl: true,
  imageUrl: true,
  rating: true,
  jobPerformance: true,
  skillsExperience: true,
  responsiveness: true,
  fairnessScore: true,
  completedJobs: true,
});

// Job requests from clients to freelancers
export const jobRequests = pgTable("job_requests", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => users.id),
  freelancerId: integer("freelancer_id").notNull().references(() => freelancers.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  budget: integer("budget"),
  status: text("status").notNull().default("pending"), // pending, accepted, declined, completed
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertJobRequestSchema = createInsertSchema(jobRequests).pick({
  clientId: true,
  freelancerId: true,
  title: true,
  description: true,
  budget: true,
  status: true,
});

// Calendar bookings for freelancers
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  freelancerId: integer("freelancer_id").notNull().references(() => freelancers.id),
  clientId: integer("client_id").notNull().references(() => users.id),
  jobRequestId: integer("job_request_id").references(() => jobRequests.id),
  title: text("title").notNull(),
  description: text("description"),
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  status: text("status").notNull().default("confirmed"), // confirmed, cancelled, completed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookings).pick({
  freelancerId: true,
  clientId: true,
  jobRequestId: true,
  title: true,
  description: true,
  date: true,
  startTime: true,
  endTime: true,
  status: true,
});

// User preferences for AI recommendations
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  preferredProfessions: text("preferred_professions").array(),
  preferredSkills: text("preferred_skills").array(),
  preferredLocations: text("preferred_locations").array(),
  maxHourlyRate: integer("max_hourly_rate"),
  minYearsExperience: integer("min_years_experience"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).pick({
  userId: true,
  preferredProfessions: true,
  preferredSkills: true,
  preferredLocations: true,
  maxHourlyRate: true,
  minYearsExperience: true,
});

// Chat history
export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  freelancerId: integer("freelancer_id").references(() => freelancers.id),
  type: text("type").notNull().default("ai"), // "ai" or "direct"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const insertChatSchema = createInsertSchema(chats).pick({
  userId: true,
  freelancerId: true,
  type: true,
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

// Notifications for users
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(), // job_request, message, booking, etc.
  isRead: boolean("is_read").notNull().default(false),
  relatedId: integer("related_id"), // ID of the related entity (job request, booking, etc.)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  title: true,
  content: true,
  type: true,
  relatedId: true,
});

// Reviews from clients to freelancers
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => users.id),
  freelancerId: integer("freelancer_id").notNull().references(() => freelancers.id),
  jobRequestId: integer("job_request_id").references(() => jobRequests.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviews).pick({
  clientId: true,
  freelancerId: true,
  jobRequestId: true,
  rating: true,
  comment: true,
});

// Define types based on the schemas
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertFreelancer = z.infer<typeof insertFreelancerSchema>;
export type Freelancer = typeof freelancers.$inferSelect;

export type InsertJobRequest = z.infer<typeof insertJobRequestSchema>;
export type JobRequest = typeof jobRequests.$inferSelect;

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;

export type InsertChat = z.infer<typeof insertChatSchema>;
export type Chat = typeof chats.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

// Legacy chat request schema for message sending - Used by existing chat system
export const legacyChatRequestSchema = z.object({
  message: z.string().min(1),
  chatId: z.number().optional(),
});

export type LegacyChatRequest = z.infer<typeof legacyChatRequestSchema>;

// Authentication schemas
export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters long").max(100),
  displayName: z.string().nullable().optional(),
  photoURL: z.string().nullable().optional(),
  firebaseUid: z.string().optional(), // Make firebaseUid optional for flexibility
  isClient: z.boolean().default(true), // Default to client if not specified
});

export const freelancerProfileSchema = z.object({
  profession: z.string(),
  skills: z.array(z.string()),
  bio: z.string(),
  hourlyRate: z.number().min(0),
  yearsOfExperience: z.number().min(0).nullable().optional(),
  location: z.string(),
  timeZone: z.string().nullable().optional(),
  availability: z.boolean().optional().default(true),
  portfolioLinks: z.array(z.string().url()).optional().default([]),
  websiteUrl: z.string().url().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  // We have two cases: Firebase auth (empty password) or regular login (6+ chars)
  password: z.string().refine(
    val => val === '' || val.length >= 6, 
    { message: "Password must be at least 6 characters" }
  ),
  displayName: z.string().nullable().optional(),
  photoURL: z.string().nullable().optional(),
  firebaseUid: z.string().optional(), // Make optional to support both auth methods
});

// Chat interface schemas
export const chatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  metadata: z.record(z.any()).optional(),
});

export const chatResponseSchema = z.object({
  content: z.string(),
  metadata: z.record(z.any()).optional(),
});

// Job request analysis schema for AI processing
export const jobAnalysisRequestSchema = z.object({
  description: z.string().min(10, "Job description must be at least 10 characters"),
  skills: z.array(z.string()).optional(),
  budget: z.number().optional(),
  timeline: z.string().optional(),
  preferences: z.record(z.any()).optional(),
});

// AI freelancer matching result
export const freelancerMatchSchema = z.object({
  freelancerId: z.number(),
  score: z.number(),
  matchReasons: z.array(z.string()),
  jobPerformanceScore: z.number(),
  skillsScore: z.number(),
  responsivenessScore: z.number(),
  fairnessScore: z.number(),
});

export const aiMatchResultSchema = z.object({
  jobAnalysis: z.record(z.any()),
  matches: z.array(freelancerMatchSchema),
  suggestedQuestions: z.array(z.string()).optional(),
});

export type RegisterRequest = z.infer<typeof registerSchema>;
export type FreelancerProfileRequest = z.infer<typeof freelancerProfileSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
// Schema for direct messaging between clients and freelancers
export const directMessageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  freelancerId: z.number().optional(),
  chatId: z.number(),
});

// Schema for initializing a chat with a freelancer
export const chatInitSchema = z.object({
  freelancerId: z.number(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;
export type DirectMessageRequest = z.infer<typeof directMessageSchema>;
export type JobAnalysisRequest = z.infer<typeof jobAnalysisRequestSchema>;
export type FreelancerMatch = z.infer<typeof freelancerMatchSchema>;
export type AIMatchResult = z.infer<typeof aiMatchResultSchema>;
