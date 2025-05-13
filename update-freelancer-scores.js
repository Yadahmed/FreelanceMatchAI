// Script to update a freelancer's scores to test the match algorithm
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

async function updateFreelancerPerformance(freelancerId, performanceValue) {
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
    
    // Update the job performance
    await pool.query(
      `UPDATE freelancers 
       SET job_performance = $1
       WHERE id = $2`,
      [performanceValue, freelancerId]
    );
    
    console.log(`Successfully updated freelancer ${freelancerId} job_performance to ${performanceValue}.`);
    console.log(`You can now test the AI matching to see if the score is affected.`);
    
  } catch (error) {
    console.error("Error updating freelancer performance:", error);
  } finally {
    await pool.end();
  }
}

async function updateFreelancerSkills(freelancerId, skillsValue) {
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
    
    // Update the skills experience
    await pool.query(
      `UPDATE freelancers 
       SET skills_experience = $1
       WHERE id = $2`,
      [skillsValue, freelancerId]
    );
    
    console.log(`Successfully updated freelancer ${freelancerId} skills_experience to ${skillsValue}.`);
    console.log(`You can now test the AI matching to see if the score is affected.`);
    
  } catch (error) {
    console.error("Error updating freelancer skills:", error);
  } finally {
    await pool.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const operation = args[0];
const freelancerId = parseInt(args[1], 10);
const value = parseInt(args[2], 10);

if (!operation || !freelancerId || isNaN(freelancerId) || !value || isNaN(value)) {
  console.error(`
Usage: 
  node update-freelancer-scores.js performance <freelancerId> <value>
  node update-freelancer-scores.js skills <freelancerId> <value>
  
Example:
  node update-freelancer-scores.js performance 1 90
  node update-freelancer-scores.js skills 1 80
  `);
  process.exit(1);
}

// Execute the appropriate operation
if (operation === 'performance') {
  updateFreelancerPerformance(freelancerId, value);
} else if (operation === 'skills') {
  updateFreelancerSkills(freelancerId, value);
} else {
  console.error(`Unknown operation: ${operation}. Use 'performance' or 'skills'.`);
  process.exit(1);
}