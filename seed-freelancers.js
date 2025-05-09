require('dotenv').config();
const { Pool } = require('@neondatabase/serverless');
const WebSocket = require('ws');
const { neonConfig } = require('@neondatabase/serverless');

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

// Sample data for realistic freelancers
const freelancers = [
  {
    userId: null, // Will be set during insertion
    profession: "Full Stack Developer",
    yearsOfExperience: 7,
    hourlyRate: 75,
    skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS", "Docker"],
    languages: ["English", "Spanish"],
    location: "San Francisco, CA",
    about: "Experienced full stack developer with a focus on scalable web applications. I have delivered over 50 projects for clients ranging from startups to Fortune 500 companies. My specialties include React, Node.js and modern cloud architecture.",
    education: "B.S. Computer Science, Stanford University",
    jobCompletionRate: 97,
    responseTime: "Usually within 1 hour",
    rating: 4.9,
    totalReviews: 132,
    portfolioUrl: "https://johnsmith.dev",
    availability: "20-30 hours per week",
    onTimeDelivery: 95,
    fairPricing: true,
    qualityScore: 94,
    communicationScore: 97,
    expertiseLevel: "Expert",
    avatarUrl: "https://randomuser.me/api/portraits/men/1.jpg"
  },
  {
    userId: null,
    profession: "UX/UI Designer",
    yearsOfExperience: 5,
    hourlyRate: 65,
    skills: ["Figma", "Adobe XD", "User Research", "Prototyping", "Wireframing", "Design Systems"],
    languages: ["English", "French"],
    location: "New York, NY",
    about: "Creative UX/UI designer passionate about creating intuitive, accessible, and beautiful digital experiences. I combine strategic thinking with design execution to deliver products that users love.",
    education: "M.F.A. Design, Parsons School of Design",
    jobCompletionRate: 100,
    responseTime: "Usually within 3 hours",
    rating: 4.8,
    totalReviews: 87,
    portfolioUrl: "https://sarahdesigns.co",
    availability: "Full-time",
    onTimeDelivery: 94,
    fairPricing: true,
    qualityScore: 96,
    communicationScore: 92,
    expertiseLevel: "Senior",
    avatarUrl: "https://randomuser.me/api/portraits/women/2.jpg"
  },
  {
    userId: null,
    profession: "Mobile App Developer",
    yearsOfExperience: 6,
    hourlyRate: 70,
    skills: ["React Native", "iOS", "Android", "Swift", "Kotlin", "Firebase"],
    languages: ["English", "Mandarin"],
    location: "Toronto, Canada",
    about: "Specialized in cross-platform mobile development using React Native. I've published over 20 apps to the App Store and Google Play with a combined 2M+ downloads.",
    education: "B.S. Software Engineering, University of Waterloo",
    jobCompletionRate: 98,
    responseTime: "Usually within 2 hours",
    rating: 4.7,
    totalReviews: 109,
    portfolioUrl: "https://michaeldevs.io",
    availability: "30-40 hours per week",
    onTimeDelivery: 92,
    fairPricing: true,
    qualityScore: 93,
    communicationScore: 88,
    expertiseLevel: "Senior",
    avatarUrl: "https://randomuser.me/api/portraits/men/3.jpg"
  },
  {
    userId: null,
    profession: "Data Scientist",
    yearsOfExperience: 4,
    hourlyRate: 80,
    skills: ["Python", "Machine Learning", "TensorFlow", "PyTorch", "Data Analysis", "Statistics"],
    languages: ["English", "German"],
    location: "Berlin, Germany",
    about: "Data scientist with expertise in machine learning and predictive modeling. I help companies make data-driven decisions and extract valuable insights from their data.",
    education: "Ph.D. Mathematics, Technical University of Berlin",
    jobCompletionRate: 96,
    responseTime: "Usually within 4 hours",
    rating: 4.6,
    totalReviews: 64,
    portfolioUrl: "https://hannadata.science",
    availability: "Part-time, 20 hours per week",
    onTimeDelivery: 91,
    fairPricing: true,
    qualityScore: 97,
    communicationScore: 89,
    expertiseLevel: "Expert",
    avatarUrl: "https://randomuser.me/api/portraits/women/4.jpg"
  },
  {
    userId: null,
    profession: "DevOps Engineer",
    yearsOfExperience: 8,
    hourlyRate: 85,
    skills: ["Kubernetes", "AWS", "Terraform", "CI/CD", "Docker", "Linux"],
    languages: ["English"],
    location: "Austin, TX",
    about: "DevOps engineer specializing in cloud infrastructure and automation. I help teams implement efficient, secure, and scalable deployment pipelines.",
    education: "B.S. Computer Engineering, Georgia Tech",
    jobCompletionRate: 99,
    responseTime: "Usually within 3 hours",
    rating: 4.9,
    totalReviews: 91,
    portfolioUrl: "https://alexdevops.tech",
    availability: "Full-time",
    onTimeDelivery: 96,
    fairPricing: true,
    qualityScore: 98,
    communicationScore: 95,
    expertiseLevel: "Expert",
    avatarUrl: "https://randomuser.me/api/portraits/men/5.jpg"
  },
  {
    userId: null,
    profession: "Content Writer",
    yearsOfExperience: 5,
    hourlyRate: 45,
    skills: ["SEO", "Blog Writing", "Copywriting", "Technical Writing", "Content Strategy"],
    languages: ["English", "Portuguese"],
    location: "Lisbon, Portugal",
    about: "SEO-focused content writer with experience in technology, SaaS, and digital marketing niches. I create engaging content that drives traffic and converts readers.",
    education: "B.A. English Literature, University of Lisbon",
    jobCompletionRate: 100,
    responseTime: "Usually within 2 hours",
    rating: 4.8,
    totalReviews: 78,
    portfolioUrl: "https://mariawrites.com",
    availability: "30 hours per week",
    onTimeDelivery: 97,
    fairPricing: true,
    qualityScore: 95,
    communicationScore: 98,
    expertiseLevel: "Senior",
    avatarUrl: "https://randomuser.me/api/portraits/women/6.jpg"
  },
  {
    userId: null,
    profession: "Graphic Designer",
    yearsOfExperience: 3,
    hourlyRate: 50,
    skills: ["Illustrator", "Photoshop", "Branding", "Typography", "Logo Design"],
    languages: ["English", "Italian"],
    location: "Milan, Italy",
    about: "Creative graphic designer with a strong background in branding and identity design. I help businesses communicate their values through memorable visual assets.",
    education: "B.F.A. Graphic Design, Politecnico di Milano",
    jobCompletionRate: 97,
    responseTime: "Usually within 5 hours",
    rating: 4.7,
    totalReviews: 53,
    portfolioUrl: "https://lucadesign.it",
    availability: "Part-time, 25 hours per week",
    onTimeDelivery: 93,
    fairPricing: true,
    qualityScore: 96,
    communicationScore: 90,
    expertiseLevel: "Mid-level",
    avatarUrl: "https://randomuser.me/api/portraits/men/7.jpg"
  },
  {
    userId: null,
    profession: "Frontend Developer",
    yearsOfExperience: 2,
    hourlyRate: 40,
    skills: ["React", "CSS/SCSS", "JavaScript", "Responsive Design", "Web Accessibility"],
    languages: ["English", "Hindi"],
    location: "Bangalore, India",
    about: "Frontend developer passionate about creating responsive, accessible, and performant web interfaces. I specialize in React and modern CSS techniques.",
    education: "B.Tech Computer Science, IIT Bangalore",
    jobCompletionRate: 95,
    responseTime: "Usually within 1 hour",
    rating: 4.5,
    totalReviews: 32,
    portfolioUrl: "https://priyacode.dev",
    availability: "Full-time",
    onTimeDelivery: 90,
    fairPricing: true,
    qualityScore: 92,
    communicationScore: 94,
    expertiseLevel: "Junior",
    avatarUrl: "https://randomuser.me/api/portraits/women/8.jpg"
  },
  {
    userId: null,
    profession: "WordPress Developer",
    yearsOfExperience: 7,
    hourlyRate: 55,
    skills: ["WordPress", "PHP", "Custom Themes", "WooCommerce", "Plugin Development"],
    languages: ["English", "Arabic"],
    location: "Dubai, UAE",
    about: "WordPress expert specializing in custom theme development and e-commerce solutions. I've helped over 100 businesses establish their online presence.",
    education: "B.S. Information Technology, American University in Dubai",
    jobCompletionRate: 99,
    responseTime: "Usually within 3 hours",
    rating: 4.8,
    totalReviews: 104,
    portfolioUrl: "https://ahmadwp.dev",
    availability: "30-35 hours per week",
    onTimeDelivery: 95,
    fairPricing: true,
    qualityScore: 93,
    communicationScore: 96,
    expertiseLevel: "Senior",
    avatarUrl: "https://randomuser.me/api/portraits/men/9.jpg"
  },
  {
    userId: null,
    profession: "Digital Marketer",
    yearsOfExperience: 4,
    hourlyRate: 60,
    skills: ["SEO", "Google Ads", "Facebook Ads", "Analytics", "Email Marketing"],
    languages: ["English", "Dutch"],
    location: "Amsterdam, Netherlands",
    about: "Digital marketing strategist with a data-driven approach. I help businesses improve their online visibility and generate quality leads through integrated marketing campaigns.",
    education: "MBA Marketing, University of Amsterdam",
    jobCompletionRate: 98,
    responseTime: "Usually within 4 hours",
    rating: 4.6,
    totalReviews: 67,
    portfolioUrl: "https://emmadigital.nl",
    availability: "Part-time, 20 hours per week",
    onTimeDelivery: 94,
    fairPricing: true,
    qualityScore: 91,
    communicationScore: 95,
    expertiseLevel: "Mid-level",
    avatarUrl: "https://randomuser.me/api/portraits/women/10.jpg"
  },
  {
    userId: null,
    profession: "Video Editor",
    yearsOfExperience: 6,
    hourlyRate: 65,
    skills: ["Premiere Pro", "After Effects", "Color Grading", "Motion Graphics", "Sound Design"],
    languages: ["English", "Japanese"],
    location: "Tokyo, Japan",
    about: "Professional video editor with experience in commercial, corporate, and social media content. I create engaging visual stories that capture audience attention.",
    education: "B.A. Film Production, Tokyo University of the Arts",
    jobCompletionRate: 97,
    responseTime: "Usually within 5 hours",
    rating: 4.7,
    totalReviews: 82,
    portfolioUrl: "https://kenji.video",
    availability: "Full-time",
    onTimeDelivery: 92,
    fairPricing: true,
    qualityScore: 95,
    communicationScore: 89,
    expertiseLevel: "Senior",
    avatarUrl: "https://randomuser.me/api/portraits/men/11.jpg"
  },
  {
    userId: null,
    profession: "3D Artist",
    yearsOfExperience: 5,
    hourlyRate: 70,
    skills: ["Blender", "Maya", "Substance Painter", "Texturing", "Character Modeling"],
    languages: ["English", "Russian"],
    location: "Vancouver, Canada",
    about: "3D artist creating detailed assets for games, animation, and virtual reality. I bring concepts to life with an eye for detail and technical proficiency.",
    education: "B.F.A. 3D Animation, Vancouver Film School",
    jobCompletionRate: 96,
    responseTime: "Usually within 6 hours",
    rating: 4.8,
    totalReviews: 58,
    portfolioUrl: "https://elena3d.art",
    availability: "30 hours per week",
    onTimeDelivery: 91,
    fairPricing: true,
    qualityScore: 97,
    communicationScore: 93,
    expertiseLevel: "Senior",
    avatarUrl: "https://randomuser.me/api/portraits/women/12.jpg"
  },
  {
    userId: null,
    profession: "Backend Developer",
    yearsOfExperience: 9,
    hourlyRate: 80,
    skills: ["Python", "Django", "Node.js", "Microservices", "API Design", "Serverless"],
    languages: ["English", "Swedish"],
    location: "Stockholm, Sweden",
    about: "Backend developer specializing in scalable architectures and API design. I build robust systems that can handle millions of requests while maintaining performance.",
    education: "M.S. Computer Science, KTH Royal Institute of Technology",
    jobCompletionRate: 99,
    responseTime: "Usually within 3 hours",
    rating: 4.9,
    totalReviews: 117,
    portfolioUrl: "https://erikbackend.dev",
    availability: "Full-time",
    onTimeDelivery: 96,
    fairPricing: true,
    qualityScore: 98,
    communicationScore: 95,
    expertiseLevel: "Expert",
    avatarUrl: "https://randomuser.me/api/portraits/men/13.jpg"
  },
  {
    userId: null,
    profession: "Social Media Manager",
    yearsOfExperience: 3,
    hourlyRate: 45,
    skills: ["Content Creation", "Instagram", "TikTok", "Community Management", "Analytics"],
    languages: ["English", "Korean"],
    location: "Seoul, South Korea",
    about: "Social media strategist helping brands build engaged communities and meaningful presence across platforms. I focus on authentic storytelling and data-driven growth.",
    education: "B.A. Communications, Seoul National University",
    jobCompletionRate: 100,
    responseTime: "Usually within 1 hour",
    rating: 4.7,
    totalReviews: 49,
    portfolioUrl: "https://jisocial.kr",
    availability: "Part-time, 25 hours per week",
    onTimeDelivery: 97,
    fairPricing: true,
    qualityScore: 93,
    communicationScore: 98,
    expertiseLevel: "Mid-level",
    avatarUrl: "https://randomuser.me/api/portraits/women/14.jpg"
  },
  {
    userId: null,
    profession: "Blockchain Developer",
    yearsOfExperience: 4,
    hourlyRate: 90,
    skills: ["Solidity", "Smart Contracts", "Web3.js", "Ethereum", "DeFi", "NFTs"],
    languages: ["English", "Ukrainian"],
    location: "Kyiv, Ukraine",
    about: "Blockchain developer with expertise in Ethereum ecosystem. I develop secure smart contracts and decentralized applications for various use cases.",
    education: "M.S. Applied Mathematics, Kyiv Polytechnic Institute",
    jobCompletionRate: 95,
    responseTime: "Usually within 4 hours",
    rating: 4.8,
    totalReviews: 62,
    portfolioUrl: "https://andriyblockchain.dev",
    availability: "30 hours per week",
    onTimeDelivery: 92,
    fairPricing: true,
    qualityScore: 96,
    communicationScore: 91,
    expertiseLevel: "Senior",
    avatarUrl: "https://randomuser.me/api/portraits/men/15.jpg"
  }
];

// Function to create a new user
async function createUser(username, email, displayName, isClient) {
  try {
    // First create user
    const userResult = await pool.query(
      `INSERT INTO users (username, email, display_name, is_client, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, username, email, display_name, is_client`,
      [username, email, displayName, isClient]
    );

    return userResult.rows[0];
  } catch (error) {
    console.error(`Error creating user ${username}:`, error);
    throw error;
  }
}

// Function to create a freelancer profile
async function createFreelancer(freelancerData) {
  try {
    // Convert arrays to PostgreSQL arrays
    const skills = JSON.stringify(freelancerData.skills);
    const languages = JSON.stringify(freelancerData.languages);

    const result = await pool.query(
      `INSERT INTO freelancers (
        user_id, profession, years_of_experience, hourly_rate, skills, languages,
        location, about, education, job_completion_rate, response_time, rating,
        total_reviews, portfolio_url, availability, on_time_delivery, 
        fair_pricing, quality_score, communication_score, expertise_level, avatar_url,
        created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, NOW(), NOW()
      )
      RETURNING id`,
      [
        freelancerData.userId,
        freelancerData.profession,
        freelancerData.yearsOfExperience,
        freelancerData.hourlyRate,
        skills,
        languages,
        freelancerData.location,
        freelancerData.about,
        freelancerData.education,
        freelancerData.jobCompletionRate,
        freelancerData.responseTime,
        freelancerData.rating,
        freelancerData.totalReviews,
        freelancerData.portfolioUrl,
        freelancerData.availability,
        freelancerData.onTimeDelivery,
        freelancerData.fairPricing,
        freelancerData.qualityScore,
        freelancerData.communicationScore,
        freelancerData.expertiseLevel,
        freelancerData.avatarUrl
      ]
    );

    return result.rows[0];
  } catch (error) {
    console.error(`Error creating freelancer for user ${freelancerData.userId}:`, error);
    throw error;
  }
}

// Function to update a user to mark that they have a freelancer profile
async function updateUserFreelancerFlag(userId) {
  try {
    await pool.query(
      `UPDATE users SET has_freelancer_profile = true WHERE id = $1`,
      [userId]
    );
    console.log(`Updated user ${userId} with has_freelancer_profile = true`);
  } catch (error) {
    console.error(`Error updating user ${userId}:`, error);
    throw error;
  }
}

// Main function to seed the database
async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // First check if we already have freelancers
    const checkResult = await pool.query('SELECT COUNT(*) FROM freelancers');
    const count = parseInt(checkResult.rows[0].count);
    
    if (count > 0) {
      console.log(`Database already has ${count} freelancers. Skipping seeding.`);
      return;
    }

    // Seed users and freelancers
    for (let i = 0; i < freelancers.length; i++) {
      const freelancer = freelancers[i];
      
      // Create username based on profession
      const nameParts = freelancer.profession.split(' ');
      const username = `${nameParts[0].toLowerCase()}${i + 1}`;
      const email = `${username}@example.com`;
      const displayName = `${freelancer.profession} ${i + 1}`;
      
      // Create a user for this freelancer (not a client)
      const user = await createUser(username, email, displayName, false);
      console.log(`Created user: ${user.username} (ID: ${user.id})`);
      
      // Assign user ID to freelancer data
      freelancer.userId = user.id;
      
      // Create the freelancer profile
      const createdFreelancer = await createFreelancer(freelancer);
      console.log(`Created freelancer: ${freelancer.profession} (ID: ${createdFreelancer.id})`);
      
      // Update user to mark that they have a freelancer profile
      await updateUserFreelancerFlag(user.id);
    }

    console.log(`Seeding complete! Created ${freelancers.length} freelancers.`);
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await pool.end();
  }
}

// Run the seed function
seedDatabase();