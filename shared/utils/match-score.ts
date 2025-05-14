/**
 * Utility functions for calculating match scores between clients and freelancers
 */

/**
 * Calculates the match score between a client and freelancer based on multiple metrics
 * The algorithm uses 4 components with specific weights:
 * - Job Performance: 50% weight
 * - Skills & Experience: 20% weight
 * - Responsiveness: 15% weight
 * - Fairness Score: 15% weight
 * 
 * This implementation handles edge cases by:
 * 1. Ensuring all inputs are within the valid range (0-100)
 * 2. Ensuring the final score is also within 0-100
 * 
 * @param jobPerformance - The freelancer's job performance score (0-100)
 * @param skillsExperience - The freelancer's skills and experience score (0-100)
 * @param responsiveness - The freelancer's responsiveness score (0-100)
 * @param fairnessScore - The freelancer's fairness score (0-100)
 * @returns A weighted match score between 0-100
 */
export function calculateMatchScore(
  jobPerformance: number,
  skillsExperience: number,
  responsiveness: number,
  fairnessScore: number
): number {
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

/**
 * Calculate a normalized performance score combining job performance and rating
 * Used in the matching algorithm for the 50% performance component
 * 
 * @param jobPerformance Job performance score 0-100
 * @param rating Rating scaled from 0-50 (representing 0-5 stars with one decimal place)
 * @returns Combined normalized performance score
 */
export function calculatePerformanceScore(jobPerformance: number, rating: number): number {
  // Ensure inputs are within valid ranges
  const validatedJobPerformance = Math.max(0, Math.min(100, jobPerformance));
  const validatedRating = Math.max(0, Math.min(50, rating));
  
  // Normalize rating to 0-100 scale
  const normalizedRating = (validatedRating / 50) * 100;
  
  // Combined score: 50% job performance, 50% normalized rating
  return (validatedJobPerformance * 0.5 + normalizedRating * 0.5) / 100 * 50;
}

/**
 * Calculate a skills match score based on requested skills and freelancer skills
 * 
 * @param freelancerSkills Array of skills the freelancer has
 * @param requestedSkills Array of skills requested for the job
 * @returns A score from 0-30 representing the skill match component
 */
export function calculateSkillsMatchScore(
  freelancerSkills: string[], 
  requestedSkills: string[]
): number {
  if (!Array.isArray(freelancerSkills) || !Array.isArray(requestedSkills)) {
    return 0;
  }
  
  // Normalize for case-insensitive comparison
  const normalizedFreelancerSkills = freelancerSkills.map(s => s.toLowerCase());
  const normalizedRequestedSkills = requestedSkills.map(s => s.toLowerCase());
  
  // Count matching skills
  const matchingSkills = normalizedFreelancerSkills.filter(skill => 
    normalizedRequestedSkills.some(reqSkill => 
      skill.includes(reqSkill) || reqSkill.includes(skill)
    )
  );
  
  // Calculate match percentage (out of 30 points)
  return (matchingSkills.length / Math.max(normalizedRequestedSkills.length, 1)) * 30;
}