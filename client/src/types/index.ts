// User types
export interface UserType {
  id: number;
  username: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  firebaseUid?: string;
  isClient: boolean;
}

// Freelancer types
export interface FreelancerType {
  id: number;
  userId: number;
  profession: string;
  skills: string[];
  bio: string;
  hourlyRate: number;
  rating?: number;
  jobPerformance: number;
  skillsExperience: number;
  responsiveness: number;
  fairnessScore: number;
  completedJobs: number;
  location: string;
  availability: boolean;
  portfolioLinks?: string[];
  imageUrl?: string;
  matchPercentage?: number;
  ranking?: number;
}

// Chat types
export interface ChatType {
  id: number;
  userId: number;
  createdAt: Date;
  updated_at: Date;
}

// Message types
export interface MessageType {
  id: number | string;
  chatId?: number;
  content: string;
  isUserMessage: boolean;
  timestamp: Date;
  freelancerResults: FreelancerType[] | null;
}

// Auth types
export interface AuthContextType {
  currentUser: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
