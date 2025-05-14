// Script to test the fixed match score algorithm
import { Pool } from '@neondatabase/serverless';
import { neonConfig } from '@neondatabase/serverless';
import WebSocket from 'ws';
import dotenv from 'dotenv';

dotenv.config();

// Enable WebSocket support for Neon
neonConfig.webSocketConstructor = WebSocket;

// Ensure we have a connection string
if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Original function that mimics the match score calculation in the AI service
function originalMatchScore(jobPerformance, skillsExperience, responsiveness, fairnessScore) {
  // Match algorithm from deepseek-service.ts
  const jobPerformanceScore = (jobPerformance / 100) * 0.5;  // 50% weight
  const skillsScore = (skillsExperience / 100) * 0.2;        // 20% weight
  const responsivenessScore = (responsiveness / 100) * 0.15; // 15% weight
  const fairnessScore_ = (fairnessScore / 100) * 0.15;       // 15% weight
  
  return (jobPerformanceScore + skillsScore + responsivenessScore + fairnessScore_) * 100;
}

// Fixed function with proper handling of edge cases
function fixedMatchScore(jobPerformance, skillsExperience, responsiveness, fairnessScore) {
  // Ensure all inputs are within valid range (0-100)
  const validatedJobPerformance = Math.max(0, Math.min(100, jobPerformance));
  const validatedSkillsExperience = Math.max(0, Math.min(100, skillsExperience));
  const validatedResponsiveness = Math.max(0, Math.min(100, responsiveness));
  const validatedFairnessScore = Math.max(0, Math.min(100, fairnessScore));
  
  // Calculate weighted components
  const jobPerformanceScore = (validatedJobPerformance / 100) * 0.5;  // 50% weight
  const skillsScore = (validatedSkillsExperience / 100) * 0.2;        // 20% weight
  const responsivenessScore = (validatedResponsiveness / 100) * 0.15; // 15% weight
  const fairnessScore_ = (validatedFairnessScore / 100) * 0.15;       // 15% weight
  
  // Calculate total score and ensure it's within valid range (0-100)
  const totalScore = (jobPerformanceScore + skillsScore + responsivenessScore + fairnessScore_) * 100;
  return Math.max(0, Math.min(100, totalScore));
}

// Run a test comparing original vs fixed algorithm
async function compareAlgorithms() {
  console.log("=== COMPARING ORIGINAL VS FIXED MATCH SCORE ALGORITHMS ===");
  
  // Test edge cases
  console.log("\nTesting Edge Cases");
  console.log("------------------");
  
  // Define test cases
  const testCases = [
    { name: "All perfect (100%)", jp: 100, se: 100, re: 100, fs: 100 },
    { name: "All minimum (0%)", jp: 0, se: 0, re: 0, fs: 0 },
    { name: "Negative values", jp: -10, se: -20, re: -30, fs: -40 },
    { name: "Values above 100%", jp: 150, se: 120, re: 110, fs: 130 },
    { name: "Mix of valid and invalid", jp: 90, se: -10, re: 80, fs: 110 },
    { name: "Extreme negatives", jp: -1000, se: -2000, re: -3000, fs: -4000 },
    { name: "Extreme positives", jp: 1000, se: 2000, re: 3000, fs: 4000 },
  ];
  
  // Run tests
  testCases.forEach(test => {
    const originalScore = originalMatchScore(test.jp, test.se, test.re, test.fs);
    const fixedScore = fixedMatchScore(test.jp, test.se, test.re, test.fs);
    
    console.log(`${test.name}:`);
    console.log(`  Input: JP=${test.jp}, SE=${test.se}, RE=${test.re}, FS=${test.fs}`);
    console.log(`  Original: ${originalScore.toFixed(2)}`);
    console.log(`  Fixed: ${fixedScore.toFixed(2)}`);
    console.log();
  });
  
  // Test with real data
  console.log("\nTesting With Real Data");
  console.log("---------------------");
  
  try {
    const result = await pool.query(
      `SELECT id, user_id, profession, job_performance, skills_experience, responsiveness, fairness_score 
       FROM freelancers 
       ORDER BY id
       LIMIT 3`
    );
    
    if (result.rows.length === 0) {
      console.log("  No freelancers found in the database.");
    } else {
      result.rows.forEach(f => {
        const originalScore = originalMatchScore(
          f.job_performance,
          f.skills_experience,
          f.responsiveness,
          f.fairness_score
        );
        
        const fixedScore = fixedMatchScore(
          f.job_performance,
          f.skills_experience,
          f.responsiveness,
          f.fairness_score
        );
        
        console.log(`Freelancer ${f.id} (${f.profession}):`);
        console.log(`  Metrics: JP=${f.job_performance}, SE=${f.skills_experience}, RE=${f.responsiveness}, FS=${f.fairness_score}`);
        console.log(`  Original score: ${originalScore.toFixed(2)}`);
        console.log(`  Fixed score: ${fixedScore.toFixed(2)}`);
        console.log();
      });
    }
  } catch (error) {
    console.error("Error retrieving freelancers:", error);
  }
  
  console.log("\nRecommendation:");
  console.log("The fixed algorithm correctly handles edge cases by:");
  console.log("1. Clamping all input values to the range 0-100");
  console.log("2. Ensuring the final score is also within 0-100");
  console.log("3. Maintaining the same weighting and calculation for valid inputs");
  console.log("\nThis prevents unexpected behavior with invalid inputs while preserving the intended behavior for valid inputs.");
}

// Run the test
compareAlgorithms().finally(() => pool.end());