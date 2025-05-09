import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';
import WebSocket from 'ws';
import { neonConfig } from '@neondatabase/serverless';

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

// Sample data for realistic Kurdish freelancers based in Iraq
const kurdishFreelancers = [
  {
    displayName: "Yad Ahmed",
    username: "yadahmed2012",
    email: "yadahmed2012@example.com",
    profession: "Full Stack Developer",
    bio: "Experienced full stack developer with a focus on scalable web applications. I have delivered over 50 projects for clients ranging from startups to large enterprises. My specialties include React, Node.js and modern cloud architecture.",
    skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS", "Docker"],
    hourlyRate: 35,
    yearsOfExperience: 7,
    location: "Erbil, Iraq",
    timeZone: "GMT+3",
    availability: true,
    portfolioLinks: ["https://github.com/yadahmed", "https://linkedin.com/in/yadahmed"],
    websiteUrl: "https://yadahmed.dev",
    imageUrl: "https://randomuser.me/api/portraits/men/1.jpg",
    rating: 5,
    jobPerformance: 95,
    skillsExperience: 90,
    responsiveness: 88,
    fairnessScore: 92,
    completedJobs: 124
  },
  {
    displayName: "Shilan Hasan",
    username: "shilanhasan2015",
    email: "shilanhasan2015@example.com",
    profession: "UX/UI Designer",
    bio: "Creative UX/UI designer passionate about creating intuitive, accessible, and beautiful digital experiences. I combine strategic thinking with design execution to deliver products that users love.",
    skills: ["Figma", "Adobe XD", "User Research", "Prototyping", "Wireframing", "Design Systems"],
    hourlyRate: 30,
    yearsOfExperience: 5,
    location: "Sulaymaniyah, Iraq",
    timeZone: "GMT+3",
    availability: true,
    portfolioLinks: ["https://behance.net/shilanhasan", "https://dribbble.com/shilanhasan"],
    websiteUrl: "https://shilanhasan.co",
    imageUrl: "https://randomuser.me/api/portraits/women/2.jpg",
    rating: 5,
    jobPerformance: 92,
    skillsExperience: 88,
    responsiveness: 94,
    fairnessScore: 90,
    completedJobs: 87
  },
  {
    displayName: "Yawar Jabar",
    username: "yawarjabar45",
    email: "yawarjabar45@example.com",
    profession: "Mobile App Developer",
    bio: "Specialized in cross-platform mobile development using React Native. I've published over 20 apps to the App Store and Google Play with a combined 1M+ downloads.",
    skills: ["React Native", "iOS", "Android", "Swift", "Kotlin", "Firebase"],
    hourlyRate: 32,
    yearsOfExperience: 6,
    location: "Duhok, Iraq",
    timeZone: "GMT+3",
    availability: true,
    portfolioLinks: ["https://github.com/yawarjabar", "https://appstore.com/yawarjabar"],
    websiteUrl: "https://yawarjabar.io",
    imageUrl: "https://randomuser.me/api/portraits/men/3.jpg",
    rating: 5,
    jobPerformance: 91,
    skillsExperience: 89,
    responsiveness: 85,
    fairnessScore: 88,
    completedJobs: 109
  },
  {
    displayName: "Danyar Kamaran",
    username: "danyarkamaran78",
    email: "danyarkamaran78@example.com",
    profession: "Data Scientist",
    bio: "Data scientist with expertise in machine learning and predictive modeling. I help companies make data-driven decisions and extract valuable insights from their data.",
    skills: ["Python", "Machine Learning", "TensorFlow", "PyTorch", "Data Analysis", "Statistics"],
    hourlyRate: 38,
    yearsOfExperience: 4,
    location: "Erbil, Iraq",
    timeZone: "GMT+3",
    availability: true,
    portfolioLinks: ["https://github.com/danyarkamaran", "https://kaggle.com/danyarkamaran"],
    websiteUrl: "https://danyarkamaran.science",
    imageUrl: "https://randomuser.me/api/portraits/men/4.jpg",
    rating: 5,
    jobPerformance: 90,
    skillsExperience: 95,
    responsiveness: 82,
    fairnessScore: 88,
    completedJobs: 64
  },
  {
    displayName: "Hama Rawa",
    username: "hamarawa33",
    email: "hamarawa33@example.com",
    profession: "DevOps Engineer",
    bio: "DevOps engineer specializing in cloud infrastructure and automation. I help teams implement efficient, secure, and scalable deployment pipelines.",
    skills: ["Kubernetes", "AWS", "Terraform", "CI/CD", "Docker", "Linux"],
    hourlyRate: 40,
    yearsOfExperience: 8,
    location: "Baghdad, Iraq",
    timeZone: "GMT+3",
    availability: true,
    portfolioLinks: ["https://github.com/hamarawa", "https://linkedin.com/in/hamarawa"],
    websiteUrl: "https://hamarawa.tech",
    imageUrl: "https://randomuser.me/api/portraits/men/5.jpg",
    rating: 5,
    jobPerformance: 96,
    skillsExperience: 94,
    responsiveness: 90,
    fairnessScore: 93,
    completedJobs: 91
  },
  {
    displayName: "Narmin Khalid",
    username: "narminkhalid67",
    email: "narminkhalid67@example.com",
    profession: "Content Writer",
    bio: "SEO-focused content writer with experience in technology, SaaS, and digital marketing niches. I create engaging content that drives traffic and converts readers.",
    skills: ["SEO", "Blog Writing", "Copywriting", "Technical Writing", "Content Strategy"],
    hourlyRate: 25,
    yearsOfExperience: 5,
    location: "Sulaymaniyah, Iraq",
    timeZone: "GMT+3",
    availability: true,
    portfolioLinks: ["https://medium.com/@narminkhalid", "https://linkedin.com/in/narminkhalid"],
    websiteUrl: "https://narminkhalid.com",
    imageUrl: "https://randomuser.me/api/portraits/women/6.jpg",
    rating: 5,
    jobPerformance: 94,
    skillsExperience: 88,
    responsiveness: 96,
    fairnessScore: 92,
    completedJobs: 78
  },
  {
    displayName: "Galan Omar",
    username: "galanomar21",
    email: "galanomar21@example.com",
    profession: "Graphic Designer",
    bio: "Creative graphic designer with a strong background in branding and identity design. I help businesses communicate their values through memorable visual assets.",
    skills: ["Illustrator", "Photoshop", "Branding", "Typography", "Logo Design"],
    hourlyRate: 28,
    yearsOfExperience: 3,
    location: "Kirkuk, Iraq",
    timeZone: "GMT+3",
    availability: true,
    portfolioLinks: ["https://behance.net/galanomar", "https://dribbble.com/galanomar"],
    websiteUrl: "https://galandesign.io",
    imageUrl: "https://randomuser.me/api/portraits/men/7.jpg",
    rating: 5,
    jobPerformance: 89,
    skillsExperience: 84,
    responsiveness: 91,
    fairnessScore: 93,
    completedJobs: 53
  }
];

// Function to create or update a user in the users table
async function createOrUpdateUser(userData) {
  try {
    // First, check if the user already exists by username
    const userCheck = await pool.query(
      `SELECT * FROM users WHERE username = $1`,
      [userData.username]
    );

    // If user exists, update them
    if (userCheck.rows.length > 0) {
      const user = userCheck.rows[0];
      console.log(`User ${userData.username} already exists with ID ${user.id}. Updating...`);
      
      // Update user with new info
      const updatedUser = await pool.query(
        `UPDATE users 
         SET display_name = $1, 
             email = $2, 
             is_client = false,
             last_login = NOW()
         WHERE id = $3
         RETURNING id, username, email, display_name, is_client`,
        [userData.displayName, userData.email, user.id]
      );
      
      return { 
        ...updatedUser.rows[0],
        wasUpdated: true
      };
    } 
    // Otherwise, create a new user
    else {
      console.log(`Creating new user: ${userData.username}`);
      
      // Create a new user (using an empty password since auth is handled by Firebase)
      const newUser = await pool.query(
        `INSERT INTO users (
           username, 
           email,
           password, 
           display_name, 
           is_client, 
           created_at, 
           last_login
         )
         VALUES ($1, $2, $3, $4, false, NOW(), NOW())
         RETURNING id, username, email, display_name, is_client`,
        [userData.username, userData.email, 'firebase_auth', userData.displayName]
      );
      
      return { 
        ...newUser.rows[0],
        wasCreated: true
      };
    }
  } catch (error) {
    console.error(`Error creating/updating user ${userData.username}:`, error);
    throw error;
  }
}

// Function to create or update a freelancer profile
async function createOrUpdateFreelancer(userId, freelancerData) {
  try {
    // Check if freelancer profile already exists for this user
    const freelancerCheck = await pool.query(
      `SELECT * FROM freelancers WHERE user_id = $1`,
      [userId]
    );

    // Convert array data to proper PostgreSQL format - using array literal format
    const skills = `{${freelancerData.skills.map(s => `"${s}"`).join(',')}}`;
    const portfolioLinks = `{${freelancerData.portfolioLinks.map(l => `"${l}"`).join(',')}}`;

    // If freelancer exists, update their profile
    if (freelancerCheck.rows.length > 0) {
      const freelancer = freelancerCheck.rows[0];
      console.log(`Freelancer profile for user ${userId} already exists with ID ${freelancer.id}. Updating...`);
      
      const updatedFreelancer = await pool.query(
        `UPDATE freelancers 
         SET profession = $1,
             skills = $2,
             bio = $3,
             hourly_rate = $4,
             years_of_experience = $5,
             location = $6,
             time_zone = $7,
             availability = $8,
             portfolio_links = $9,
             website_url = $10,
             image_url = $11,
             rating = $12,
             job_performance = $13,
             skills_experience = $14,
             responsiveness = $15,
             fairness_score = $16,
             completed_jobs = $17
         WHERE id = $18
         RETURNING id, user_id, profession`,
        [
          freelancerData.profession,
          skills,
          freelancerData.bio,
          freelancerData.hourlyRate,
          freelancerData.yearsOfExperience,
          freelancerData.location,
          freelancerData.timeZone,
          freelancerData.availability,
          portfolioLinks,
          freelancerData.websiteUrl,
          freelancerData.imageUrl,
          freelancerData.rating,
          freelancerData.jobPerformance,
          freelancerData.skillsExperience,
          freelancerData.responsiveness,
          freelancerData.fairnessScore,
          freelancerData.completedJobs,
          freelancer.id
        ]
      );
      
      return {
        ...updatedFreelancer.rows[0],
        wasUpdated: true
      };
    } 
    // Otherwise, create a new freelancer profile
    else {
      console.log(`Creating new freelancer profile for user ${userId}`);
      
      const newFreelancer = await pool.query(
        `INSERT INTO freelancers (
           user_id,
           profession,
           skills,
           bio,
           hourly_rate,
           years_of_experience,
           location,
           time_zone,
           availability,
           portfolio_links,
           website_url,
           image_url,
           rating,
           job_performance,
           skills_experience,
           responsiveness,
           fairness_score,
           completed_jobs
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         RETURNING id, user_id, profession`,
        [
          userId,
          freelancerData.profession,
          skills,
          freelancerData.bio,
          freelancerData.hourlyRate,
          freelancerData.yearsOfExperience,
          freelancerData.location,
          freelancerData.timeZone,
          freelancerData.availability,
          portfolioLinks,
          freelancerData.websiteUrl,
          freelancerData.imageUrl,
          freelancerData.rating,
          freelancerData.jobPerformance,
          freelancerData.skillsExperience,
          freelancerData.responsiveness,
          freelancerData.fairnessScore,
          freelancerData.completedJobs
        ]
      );
      
      return {
        ...newFreelancer.rows[0],
        wasCreated: true
      };
    }
  } catch (error) {
    console.error(`Error creating/updating freelancer for user ${userId}:`, error);
    throw error;
  }
}

// Function to check and possibly update the user
async function updateUserFreelancerFlag(userId) {
  try {
    // Check if has_freelancer_profile column exists
    const columnCheck = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'has_freelancer_profile';
    `);
    
    // Only try to update if the column exists
    if (columnCheck.rows.length > 0) {
      await pool.query(
        `UPDATE users SET has_freelancer_profile = true WHERE id = $1`,
        [userId]
      );
      console.log(`Updated user ${userId} with has_freelancer_profile = true`);
    } else {
      console.log(`Column has_freelancer_profile doesn't exist, skipping update`);
    }
  } catch (error) {
    console.error(`Error updating user ${userId}:`, error);
    // Just log the error but don't throw to prevent stopping the process
    console.log(`Continuing with seeding...`);
  }
}

// Main function to seed the database
async function seedDatabase() {
  try {
    console.log('Starting database seeding with Kurdish freelancers...');
    
    // Process each Kurdish freelancer
    let created = 0;
    let updated = 0;
    
    for (const freelancerData of kurdishFreelancers) {
      // Step 1: Create or update the user
      const user = await createOrUpdateUser(freelancerData);
      
      if (user.wasCreated) {
        created++;
      } else if (user.wasUpdated) {
        updated++;
      }
      
      // Step 2: Create or update the freelancer profile
      const freelancer = await createOrUpdateFreelancer(user.id, freelancerData);
      
      // Step 3: Ensure the user is marked as having a freelancer profile
      await updateUserFreelancerFlag(user.id);
      
      console.log(`Processed: ${freelancerData.displayName} (${freelancerData.profession})`);
    }

    console.log(`Seeding complete! Created ${created} new and updated ${updated} existing Kurdish freelancers.`);
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await pool.end();
  }
}

// Run the seed function
seedDatabase();