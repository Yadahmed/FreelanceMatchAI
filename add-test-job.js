// Utility script to add a test job request for the currently logged in freelancer
import * as dotenv from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Configure Neon to use websockets
const neonConfig = { webSocketConstructor: ws };

async function addTestJob() {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL environment variable is not set');
      return;
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Hardcode to freelancer ID 60 based on our logs which show this is the active user
    const freelancerId = 60;
    const clientId = 97; // Using client ID 97 (Rozha) based on logs
    
    // Create a new job with 'accepted' status for testing completion
    const result = await pool.query(`
      INSERT INTO job_requests 
      (client_id, freelancer_id, title, description, budget, status, created_at, updated_at)
      VALUES 
      ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id
    `, [clientId, freelancerId, 'Test Job for Completion', 'This is a test job that can be completed to test the streak system.', 100, 'accepted']);
    
    if (result.rows && result.rows.length > 0) {
      console.log(`Successfully created test job with ID: ${result.rows[0].id}`);
    } else {
      console.log('Job created but no ID was returned');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error creating test job:', error);
  }
}

addTestJob();