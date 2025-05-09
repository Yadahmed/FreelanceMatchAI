#!/usr/bin/env node

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ws from 'ws';
import { v4 as uuidv4 } from 'uuid';

// Setup to work in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure PostgreSQL connection
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable not set');
  process.exit(1);
}

// Configure WebSocket for Neon
global.WebSocket = ws;

// Create a connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function importFreelancers() {
  try {
    console.log('Starting freelancer import...');
    
    // Read the JSON file
    const filePath = path.join(__dirname, 'attached_assets', 'freelancers_data.json');
    const fileData = fs.readFileSync(filePath, 'utf8');
    const freelancers = JSON.parse(fileData);
    
    console.log(`Loaded ${freelancers.length} freelancers from file`);
    
    // Create a map to store existing users
    const existingUsers = new Map();

    // For each freelancer in the file
    for (const freelancer of freelancers) {
      try {
        // First, create a user for this freelancer
        const username = generateUsername(freelancer.displayName);
        const email = `${username.toLowerCase()}@example.com`;
        
        // Insert user with SQL to get ID back directly
        const userInsertResult = await pool.query(`
          INSERT INTO users (username, email, password, is_client, firebase_uid)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email
          RETURNING id
        `, [username, email, 'password_placeholder', false, uuidv4()]);
        
        const userId = userInsertResult.rows[0].id;
        
        // Now create the freelancer profile linked to this user
        const freelancerData = {
          user_id: userId,
          display_name: freelancer.displayName,
          profession: freelancer.profession,
          skills: freelancer.skills,
          years_of_experience: freelancer.yearsOfExperience,
          hourly_rate: freelancer.hourlyRate,
          rating: freelancer.rating,
          location: freelancer.location,
          bio: freelancer.bio,
          job_performance: freelancer.jobPerformance
        };
        
        // Check if this freelancer already exists for the user
        const existingFreelancer = await pool.query(`
          SELECT id FROM freelancers WHERE user_id = $1
        `, [userId]);
        
        if (existingFreelancer.rows.length > 0) {
          // Update existing freelancer
          const freelancerId = existingFreelancer.rows[0].id;
          await pool.query(`
            UPDATE freelancers 
            SET profession = $1, skills = $2, 
                years_of_experience = $3, hourly_rate = $4, rating = $5,
                location = $6, bio = $7, job_performance = $8
            WHERE id = $9
          `, [
            freelancerData.profession,
            freelancerData.skills, // PostgreSQL will handle the array
            freelancerData.years_of_experience,
            freelancerData.hourly_rate,
            freelancerData.rating,
            freelancerData.location,
            freelancerData.bio,
            freelancerData.job_performance,
            freelancerId
          ]);
          console.log(`Updated existing freelancer: ${freelancerData.display_name}`);
        } else {
          // Insert new freelancer
          await pool.query(`
            INSERT INTO freelancers 
            (user_id, profession, skills, years_of_experience, 
             hourly_rate, rating, location, bio, job_performance)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            freelancerData.user_id,
            freelancerData.profession,
            freelancerData.skills, // PostgreSQL will handle the array
            freelancerData.years_of_experience,
            freelancerData.hourly_rate,
            freelancerData.rating,
            freelancerData.location,
            freelancerData.bio,
            freelancerData.job_performance
          ]);
          console.log(`Created new freelancer: ${freelancerData.display_name}`);
        }
        
      } catch (error) {
        console.error(`Error processing freelancer ${freelancer.displayName}:`, error);
      }
    }
    
    console.log('Freelancer import completed successfully!');
  } catch (error) {
    console.error('Error importing freelancers:', error);
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

// Helper function to generate a username from display name
function generateUsername(displayName) {
  // Replace spaces, remove special chars, and add random number for uniqueness
  return displayName.replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase() +
    Math.floor(Math.random() * 1000);
}

// Run the import
importFreelancers()
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });