// One-time utility script to promote a user to admin
// Run with: node promote-admin.js <username>

require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { eq } = require('drizzle-orm');
const ws = require('ws');

// Configuration for neon database
const { neonConfig } = require('@neondatabase/serverless');
neonConfig.webSocketConstructor = ws;

async function promoteToAdmin() {
  // Get username to promote
  const username = process.argv[2];
  if (!username) {
    console.error('Please provide a username: node promote-admin.js <username>');
    process.exit(1);
  }

  // Connect to database
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Dynamically import the schema
    const { users } = require('./shared/schema');
    
    // Create drizzle instance
    const db = drizzle({ client: pool, schema: { users } });
    
    // Update user to be admin
    const result = await db.update(users)
      .set({ isAdmin: true })
      .where(eq(users.username, username))
      .returning();
    
    if (result.length === 0) {
      console.error(`No user found with username: ${username}`);
      process.exit(1);
    }
    
    console.log(`Success! User ${username} has been promoted to admin.`);
    console.log('User data:', result[0]);
    
  } catch (error) {
    console.error('Error promoting user to admin:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

promoteToAdmin();