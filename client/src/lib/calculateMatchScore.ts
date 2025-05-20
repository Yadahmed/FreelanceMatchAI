/**
 * Calculate match score from freelancer performance metrics
 * All metrics should be integers on a 0-100 scale
 */
export function calculateMatchScore(
  jobPerformance: number = 0, 
  skillsExperience: number = 0, 
  responsiveness: number = 0, 
  fairnessScore: number = 0
): number {
  // Ensure all inputs are numbers and clamped between 0-100
  const normalizedJobPerformance = Math.max(0, Math.min(100, Number(jobPerformance) || 0));
  const normalizedSkillsExperience = Math.max(0, Math.min(100, Number(skillsExperience) || 0));
  const normalizedResponsiveness = Math.max(0, Math.min(100, Number(responsiveness) || 0));
  const normalizedFairnessScore = Math.max(0, Math.min(100, Number(fairnessScore) || 0));
  
  // Weighted formula - job performance has highest weight
  const weightedScore = (
    normalizedJobPerformance * 0.40 +    // 40% weight
    normalizedSkillsExperience * 0.30 +  // 30% weight
    normalizedResponsiveness * 0.20 +    // 20% weight
    normalizedFairnessScore * 0.10       // 10% weight
  );
  
  // Round to nearest integer
  return Math.round(weightedScore);
}