// Script to comprehensively test the match score algorithm
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

// Function that mimics the match score calculation in the AI service
function calculateMatchScore(jobPerformance, skillsExperience, responsiveness, fairnessScore) {
  // Match algorithm from deepseek-service.ts
  const jobPerformanceScore = (jobPerformance / 100) * 0.5;  // 50% weight
  const skillsScore = (skillsExperience / 100) * 0.2;        // 20% weight
  const responsivenessScore = (responsiveness / 100) * 0.15; // 15% weight
  const fairnessScore_ = (fairnessScore / 100) * 0.15;       // 15% weight
  
  return (jobPerformanceScore + skillsScore + responsivenessScore + fairnessScore_) * 100;
}

// Run a comprehensive test
async function comprehensiveMatchScoreTest() {
  console.log("=== COMPREHENSIVE MATCH SCORE ALGORITHM TEST ===");
  
  // Test 1: Perfect scores
  console.log("\nTest 1: Perfect scores for all metrics (100%)");
  const perfectScore = calculateMatchScore(100, 100, 100, 100);
  console.log(`  Match score with perfect metrics: ${perfectScore.toFixed(2)} / 100.00`);
  
  // Test 2: Worst scores
  console.log("\nTest 2: Minimum scores for all metrics (0%)");
  const worstScore = calculateMatchScore(0, 0, 0, 0);
  console.log(`  Match score with minimum metrics: ${worstScore.toFixed(2)} / 100.00`);
  
  // Test 3: Each metric's individual contribution
  console.log("\nTest 3: Individual metric contribution (one at 100%, others at 0%)");
  
  const jobPerfOnlyScore = calculateMatchScore(100, 0, 0, 0);
  console.log(`  Job Performance only (100%): ${jobPerfOnlyScore.toFixed(2)} / 100.00 (50% weight)`);
  
  const skillsOnlyScore = calculateMatchScore(0, 100, 0, 0);
  console.log(`  Skills Experience only (100%): ${skillsOnlyScore.toFixed(2)} / 100.00 (20% weight)`);
  
  const responsivenessOnlyScore = calculateMatchScore(0, 0, 100, 0);
  console.log(`  Responsiveness only (100%): ${responsivenessOnlyScore.toFixed(2)} / 100.00 (15% weight)`);
  
  const fairnessOnlyScore = calculateMatchScore(0, 0, 0, 100);
  console.log(`  Fairness Score only (100%): ${fairnessOnlyScore.toFixed(2)} / 100.00 (15% weight)`);
  
  // Test 4: Realistic scenarios with database freelancers
  console.log("\nTest 4: Real freelancers from database");
  
  try {
    const result = await pool.query(
      `SELECT id, user_id, profession, job_performance, skills_experience, responsiveness, fairness_score 
       FROM freelancers 
       ORDER BY id
       LIMIT 5`
    );
    
    if (result.rows.length === 0) {
      console.log("  No freelancers found in the database.");
    } else {
      result.rows.forEach(f => {
        const score = calculateMatchScore(
          f.job_performance,
          f.skills_experience,
          f.responsiveness,
          f.fairness_score
        );
        
        console.log(`  Freelancer ${f.id} (${f.profession}):`);
        console.log(`    Metrics: JP=${f.job_performance}, SE=${f.skills_experience}, RE=${f.responsiveness}, FS=${f.fairness_score}`);
        console.log(`    Match score: ${score.toFixed(2)} / 100.00`);
        
        // Component scores
        const jpComponent = (f.job_performance / 100) * 0.5 * 100;
        const seComponent = (f.skills_experience / 100) * 0.2 * 100;
        const reComponent = (f.responsiveness / 100) * 0.15 * 100;
        const fsComponent = (f.fairness_score / 100) * 0.15 * 100;
        
        console.log(`    Components: JP=${jpComponent.toFixed(2)}, SE=${seComponent.toFixed(2)}, RE=${reComponent.toFixed(2)}, FS=${fsComponent.toFixed(2)}`);
        console.log();
      });
    }
  } catch (error) {
    console.error("Error retrieving freelancers:", error);
  }
  
  // Test 5: Edge cases
  console.log("\nTest 5: Edge cases");
  
  // Very high job performance but low on other metrics
  const highJpLowOthers = calculateMatchScore(100, 20, 20, 20);
  console.log(`  High Job Performance (100%) but low other metrics (20%): ${highJpLowOthers.toFixed(2)} / 100.00`);
  
  // Low job performance but high on other metrics
  const lowJpHighOthers = calculateMatchScore(20, 100, 100, 100);
  console.log(`  Low Job Performance (20%) but high other metrics (100%): ${lowJpHighOthers.toFixed(2)} / 100.00`);
  
  // Negative values (should be clamped or handled)
  const negativeInputs = calculateMatchScore(-10, -10, -10, -10);
  console.log(`  Negative inputs (-10): ${negativeInputs.toFixed(2)} / 100.00 (should be 0 or error handled)`);
  
  // Out of range values (>100)
  const outOfRangeInputs = calculateMatchScore(150, 150, 150, 150);
  console.log(`  Out of range inputs (150): ${outOfRangeInputs.toFixed(2)} / 100.00 (should be capped or error handled)`);
}

// Run the test
comprehensiveMatchScoreTest().finally(() => pool.end());