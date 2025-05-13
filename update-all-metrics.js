// Script to update all metrics for a freelancer to test the match algorithm
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

async function updateAllMetrics(freelancerId, jobPerformance, skillsExperience, responsiveness, fairnessScore) {
  try {
    // First get current values
    const result = await pool.query(
      `SELECT id, job_performance, skills_experience, responsiveness, fairness_score 
       FROM freelancers WHERE id = $1`,
      [freelancerId]
    );
    
    if (result.rows.length === 0) {
      console.error(`Freelancer with ID ${freelancerId} not found.`);
      return;
    }
    
    const freelancer = result.rows[0];
    console.log("Current freelancer values:", {
      id: freelancer.id,
      jobPerformance: freelancer.job_performance,
      skillsExperience: freelancer.skills_experience,
      responsiveness: freelancer.responsiveness,
      fairnessScore: freelancer.fairness_score
    });
    
    // Calculate the baseline match score with existing values
    const baselineScore = calculateMatchScore(
      freelancer.job_performance,
      freelancer.skills_experience,
      freelancer.responsiveness,
      freelancer.fairness_score
    );
    console.log(`Current estimated match score: ${baselineScore.toFixed(2)}`);
    
    // Update all metrics
    await pool.query(
      `UPDATE freelancers 
       SET job_performance = $1,
           skills_experience = $2,
           responsiveness = $3,
           fairness_score = $4
       WHERE id = $5`,
      [jobPerformance, skillsExperience, responsiveness, fairnessScore, freelancerId]
    );
    
    // Calculate the new match score
    const newScore = calculateMatchScore(
      jobPerformance,
      skillsExperience,
      responsiveness,
      fairnessScore
    );
    
    console.log(`Updated freelancer ${freelancerId} with new metrics:`);
    console.log({
      jobPerformance,
      skillsExperience,
      responsiveness,
      fairnessScore
    });
    console.log(`New estimated match score: ${newScore.toFixed(2)}`);
    console.log(`Score change: ${(newScore - baselineScore).toFixed(2)}`);
    console.log(`You can now test the AI matching to see if the score matches our calculation.`);
    
  } catch (error) {
    console.error("Error updating freelancer metrics:", error);
  } finally {
    await pool.end();
  }
}

// Function that mimics the match score calculation in the AI service
function calculateMatchScore(jobPerformance, skillsExperience, responsiveness, fairnessScore) {
  // Match algorithm from deepseek-service.ts
  const jobPerformanceScore = (jobPerformance / 100) * 0.5;  // 50% weight
  const skillsScore = (skillsExperience / 100) * 0.2;        // 20% weight
  const responsivenessScore = (responsiveness / 100) * 0.15; // 15% weight
  const fairnessScore_ = (fairnessScore / 100) * 0.15;       // 15% weight
  
  return (jobPerformanceScore + skillsScore + responsivenessScore + fairnessScore_) * 100;
}

async function listFreelancers() {
  try {
    const result = await pool.query(
      `SELECT id, user_id, profession, job_performance, skills_experience, responsiveness, fairness_score 
       FROM freelancers 
       ORDER BY id`
    );
    
    console.log("Available freelancers:");
    result.rows.forEach(f => {
      const score = calculateMatchScore(
        f.job_performance,
        f.skills_experience,
        f.responsiveness,
        f.fairness_score
      );
      
      console.log(`ID: ${f.id}, User ID: ${f.user_id}, Profession: ${f.profession}`);
      console.log(`  Metrics: JP=${f.job_performance}, SE=${f.skills_experience}, RE=${f.responsiveness}, FS=${f.fairness_score}`);
      console.log(`  Estimated match score: ${score.toFixed(2)}`);
      console.log();
    });
  } catch (error) {
    console.error("Error listing freelancers:", error);
  } finally {
    await pool.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === 'list') {
  listFreelancers();
} else if (command === 'update') {
  const freelancerId = parseInt(args[1], 10);
  const jobPerformance = parseInt(args[2], 10);
  const skillsExperience = parseInt(args[3], 10);
  const responsiveness = parseInt(args[4], 10);
  const fairnessScore = parseInt(args[5], 10);
  
  if (isNaN(freelancerId) || isNaN(jobPerformance) || isNaN(skillsExperience) ||
      isNaN(responsiveness) || isNaN(fairnessScore)) {
    console.error(`
Usage:
  node update-all-metrics.js list
  node update-all-metrics.js update <freelancerId> <jobPerformance> <skillsExperience> <responsiveness> <fairnessScore>
  
Example:
  node update-all-metrics.js update 1 90 80 70 75
    `);
    process.exit(1);
  }
  
  updateAllMetrics(freelancerId, jobPerformance, skillsExperience, responsiveness, fairnessScore);
} else {
  console.error(`
Usage:
  node update-all-metrics.js list
  node update-all-metrics.js update <freelancerId> <jobPerformance> <skillsExperience> <responsiveness> <fairnessScore>
  
Example:
  node update-all-metrics.js update 1 90 80 70 75
  `);
  process.exit(1);
}