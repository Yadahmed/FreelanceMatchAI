// Script to create a test job directly in the database
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { config } from 'dotenv';

// Load environment variables
config();

// Neon database configuration
const neonConfig = { webSocketConstructor: ws };

async function createTestJob() {
  try {
    console.log('Creating a test job for completion testing...');
    
    // Connect to the database
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Create a new job request with 'accepted' status for testing
    const result = await pool.query(`
      INSERT INTO job_requests 
      (client_id, freelancer_id, title, description, budget, status, created_at, updated_at)
      VALUES 
      (97, 60, 'New Test Job For Completion', 'This is a new test job for completion with streak tracking.', 200, 'accepted', NOW(), NOW())
      RETURNING id;
    `);
    
    if (result.rows && result.rows.length > 0) {
      console.log(`Successfully created test job with ID: ${result.rows[0].id}`);
    } else {
      console.log('Job created but no ID was returned');
    }
    
    // Close the pool
    await pool.end();
    
  } catch (error) {
    console.error('Error creating test job:', error);
  }
}

// Run the function
createTestJob();