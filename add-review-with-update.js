// Script to add a review and update matching metrics
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

async function addReviewAndUpdateMetrics(clientId, freelancerId, rating, jobPerformanceImpact, skillsImpact, responsivenessImpact, fairnessImpact) {
  try {
    // Start a transaction
    await pool.query('BEGIN');
    
    // First get current values
    const freelancerResult = await pool.query(
      `SELECT id, job_performance, skills_experience, responsiveness, fairness_score, rating 
       FROM freelancers WHERE id = $1`,
      [freelancerId]
    );
    
    if (freelancerResult.rows.length === 0) {
      console.error(`Freelancer with ID ${freelancerId} not found.`);
      await pool.query('ROLLBACK');
      return;
    }
    
    const freelancer = freelancerResult.rows[0];
    console.log("Current freelancer values:", {
      id: freelancer.id,
      rating: freelancer.rating,
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
    
    // 1. Insert a review
    const reviewResult = await pool.query(
      `INSERT INTO reviews (client_id, freelancer_id, rating, comment, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [clientId, freelancerId, rating, `Test review with rating ${rating}`]
    );
    
    const reviewId = reviewResult.rows[0].id;
    console.log(`Added review ID ${reviewId} with rating ${rating}`);
    
    // 2. Get all reviews and calculate average rating
    const reviewsResult = await pool.query(
      `SELECT AVG(rating) as avg_rating FROM reviews WHERE freelancer_id = $1`,
      [freelancerId]
    );
    
    const avgRating = parseFloat(reviewsResult.rows[0].avg_rating);
    const scaledRating = Math.round(avgRating * 10); // Convert 1-5 to 10-50
    
    console.log(`New average rating: ${avgRating.toFixed(2)} (scaled to ${scaledRating})`);
    
    // 3. Calculate new metrics based on review impact
    const newJobPerformance = Math.min(100, Math.max(0, freelancer.job_performance + jobPerformanceImpact));
    const newSkillsExperience = Math.min(100, Math.max(0, freelancer.skills_experience + skillsImpact));
    const newResponsiveness = Math.min(100, Math.max(0, freelancer.responsiveness + responsivenessImpact));
    const newFairnessScore = Math.min(100, Math.max(0, freelancer.fairness_score + fairnessImpact));
    
    // 4. Update the freelancer with new metrics
    await pool.query(
      `UPDATE freelancers 
       SET rating = $1,
           job_performance = $2,
           skills_experience = $3,
           responsiveness = $4,
           fairness_score = $5
       WHERE id = $6`,
      [scaledRating, newJobPerformance, newSkillsExperience, newResponsiveness, newFairnessScore, freelancerId]
    );
    
    // Commit the transaction
    await pool.query('COMMIT');
    
    // Calculate the new match score
    const newScore = calculateMatchScore(
      newJobPerformance,
      newSkillsExperience,
      newResponsiveness,
      newFairnessScore
    );
    
    console.log(`Updated freelancer ${freelancerId} with new metrics:`);
    console.log({
      rating: scaledRating,
      jobPerformance: newJobPerformance,
      skillsExperience: newSkillsExperience,
      responsiveness: newResponsiveness,
      fairnessScore: newFairnessScore
    });
    
    console.log(`New estimated match score: ${newScore.toFixed(2)}`);
    console.log(`Score change: ${(newScore - baselineScore).toFixed(2)}`);
    console.log(`You can now test the AI matching to see if the score matches our calculation.`);
    
  } catch (error) {
    console.error("Error adding review and updating metrics:", error);
    await pool.query('ROLLBACK');
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

// Parse command line arguments
const args = process.argv.slice(2);
const clientId = parseInt(args[0], 10);
const freelancerId = parseInt(args[1], 10);
const rating = parseFloat(args[2]);
const jobPerformanceImpact = parseInt(args[3], 10);
const skillsImpact = parseInt(args[4], 10);
const responsivenessImpact = parseInt(args[5], 10);
const fairnessImpact = parseInt(args[6], 10);

if (isNaN(clientId) || isNaN(freelancerId) || isNaN(rating) || 
    isNaN(jobPerformanceImpact) || isNaN(skillsImpact) || 
    isNaN(responsivenessImpact) || isNaN(fairnessImpact)) {
  console.error(`
Usage:
  node add-review-with-update.js <clientId> <freelancerId> <rating> <jobPerformanceImpact> <skillsImpact> <responsivenessImpact> <fairnessImpact>
  
Example:
  node add-review-with-update.js 1 2 4.5 10 5 8 7
  
Description:
  - clientId: ID of the client submitting the review
  - freelancerId: ID of the freelancer being reviewed
  - rating: Review rating (1-5)
  - jobPerformanceImpact: How much to increase/decrease job performance (-100 to 100)
  - skillsImpact: How much to increase/decrease skills experience (-100 to 100)
  - responsivenessImpact: How much to increase/decrease responsiveness (-100 to 100)
  - fairnessImpact: How much to increase/decrease fairness score (-100 to 100)
  `);
  process.exit(1);
}

addReviewAndUpdateMetrics(clientId, freelancerId, rating, jobPerformanceImpact, skillsImpact, responsivenessImpact, fairnessImpact);