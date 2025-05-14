// Script to test how job performance affects match score
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

// Test how updating jobPerformance affects match score
async function testJobPerformanceEffect() {
  console.log("Testing how Job Performance affects match scores...");
  
  try {
    // Get a freelancer ID to test with
    const freelancerResult = await pool.query(
      `SELECT id, job_performance, skills_experience, responsiveness, fairness_score FROM freelancers 
       LIMIT 1`
    );
    
    if (freelancerResult.rows.length === 0) {
      console.log("No freelancers found in the database.");
      return;
    }
    
    const freelancer = freelancerResult.rows[0];
    console.log("Initial freelancer values:", {
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
    console.log(`Baseline match score: ${baselineScore.toFixed(2)}`);
    
    // Test changing job performance
    const lowJobPerformance = 10; // Low job performance
    const highJobPerformance = 90; // High job performance
    
    const lowScore = calculateMatchScore(
      lowJobPerformance,
      freelancer.skills_experience,
      freelancer.responsiveness,
      freelancer.fairness_score
    );
    
    const highScore = calculateMatchScore(
      highJobPerformance,
      freelancer.skills_experience,
      freelancer.responsiveness,
      freelancer.fairness_score
    );
    
    console.log(`Match score with low job performance (${lowJobPerformance}): ${lowScore.toFixed(2)}`);
    console.log(`Match score with high job performance (${highJobPerformance}): ${highScore.toFixed(2)}`);
    console.log(`Job performance impact on score: ${(highScore - lowScore).toFixed(2)}`);
    
    // Test changing skills experience
    const lowSkillsExperience = 10; // Low skills experience
    const highSkillsExperience = 90; // High skills experience
    
    const lowSkillScore = calculateMatchScore(
      freelancer.job_performance,
      lowSkillsExperience,
      freelancer.responsiveness,
      freelancer.fairness_score
    );
    
    const highSkillScore = calculateMatchScore(
      freelancer.job_performance,
      highSkillsExperience,
      freelancer.responsiveness,
      freelancer.fairness_score
    );
    
    console.log(`Match score with low skills experience (${lowSkillsExperience}): ${lowSkillScore.toFixed(2)}`);
    console.log(`Match score with high skills experience (${highSkillsExperience}): ${highSkillScore.toFixed(2)}`);
    console.log(`Skills experience impact on score: ${(highSkillScore - lowSkillScore).toFixed(2)}`);
    
    // We'll update a test freelancer to validate our calculations
    const testFreelancerId = freelancer.id;
    console.log(`\nUpdating test freelancer ${testFreelancerId} to have high job performance...`);
    
    // Update the freelancer with high job performance
    await pool.query(
      `UPDATE freelancers 
       SET job_performance = $1,
           skills_experience = $2,
           responsiveness = $3,
           fairness_score = $4
       WHERE id = $5`,
      [highJobPerformance, freelancer.skills_experience, freelancer.responsiveness, freelancer.fairness_score, testFreelancerId]
    );
    
    console.log(`Test freelancer updated. You can now test the AI matching functionality to see if job performance affects the matching score.`);
    
    // Now reset the values to their original state
    console.log(`\nResetting freelancer to original values...`);
    await pool.query(
      `UPDATE freelancers 
       SET job_performance = $1,
           skills_experience = $2, 
           responsiveness = $3,
           fairness_score = $4
       WHERE id = $5`,
      [freelancer.job_performance, freelancer.skills_experience, freelancer.responsiveness, freelancer.fairness_score, testFreelancerId]
    );
    
    console.log("Test complete. Freelancer values have been reset to their original state.");
    
  } catch (error) {
    console.error("Error testing job performance effect:", error);
  } finally {
    await pool.end();
  }
}

// Function that mimics the match score calculation in the AI service
function calculateMatchScore(jobPerformance, skillsExperience, responsiveness, fairnessScore) {
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

// Run the test
testJobPerformanceEffect();