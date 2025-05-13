import { z } from "zod";
import { pgTable, text, serial, integer, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { users, jobRequests } from "./schema";

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

// Chat interface schemas for AI interactions
export const aiChatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  metadata: z.record(z.any()).optional(),
});

export const aiChatResponseSchema = z.object({
  content: z.string(),
  metadata: z.record(z.any()).optional(),
  clarifyingQuestions: z.array(z.string()).optional(),
  needsMoreInfo: z.boolean().optional(),
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
  jobAnalysis: z.record(z.any()).and(z.object({
    needsMoreInfo: z.boolean().optional()
  })),
  matches: z.array(freelancerMatchSchema),
  suggestedQuestions: z.array(z.string()).optional(),
  needsMoreInfo: z.boolean().optional(),
});

// Export types
export type InsertAIChatMessage = z.infer<typeof insertAIChatMessageSchema>;
export type AIChatMessage = typeof aiChatMessages.$inferSelect;

export type InsertAIJobAnalysis = z.infer<typeof insertAIJobAnalysisSchema>;
export type AIJobAnalysis = typeof aiJobAnalyses.$inferSelect;

export type AIChatRequest = z.infer<typeof aiChatRequestSchema>;
export type AIChatResponse = z.infer<typeof aiChatResponseSchema>;
export type JobAnalysisRequest = z.infer<typeof jobAnalysisRequestSchema>;
export type FreelancerMatch = z.infer<typeof freelancerMatchSchema>;
export type AIMatchResult = z.infer<typeof aiMatchResultSchema>;