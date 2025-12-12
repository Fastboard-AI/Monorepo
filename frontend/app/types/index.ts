export interface Skill {
  name: string;
  level: "beginner" | "intermediate" | "advanced" | "expert";
  yearsOfExperience?: number;
}

export interface WorkExperience {
  title: string;
  company: string;
  duration: string;
  description?: string;
}

export interface Education {
  degree: string;
  institution: string;
  year: string;
  field?: string;
}

export interface SocialLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
  twitter?: string;
}

export interface ScoreBreakdown {
  skillsMatch: number;
  experienceMatch: number;
  workStyleAlignment: number;
  teamFit: number;
}

export interface Candidate {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  title: string;
  summary?: string;
  skills: Skill[];
  experience: WorkExperience[];
  education: Education[];
  links: SocialLinks;
  talentFitScore: number;
  scoreBreakdown: ScoreBreakdown;
  avatarUrl?: string;
  resumeFileName?: string;
  uploadedAt: Date;
}

export type JobStatus = "sourcing" | "reviewing" | "filled" | "closed";
export type ExperienceLevel = "entry" | "mid" | "senior" | "lead" | "any";

// Work style preferences for team members
export interface WorkStyle {
  communication: "async" | "sync" | "mixed";
  collaboration: "independent" | "collaborative" | "balanced";
  pace: "fast" | "steady" | "flexible";
}

// Team member = existing employee (not a candidate)
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  skills: Skill[];
  experienceLevel: ExperienceLevel;
  workStyle: WorkStyle;
}

export interface Team {
  id: string;
  name: string;
  members: TeamMember[];  // Existing employees, not candidates
  compatibilityScore: number;
  targetRole?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Job {
  id: string;
  title: string;
  description?: string;
  location?: string;
  requiredSkills: string[];
  experienceLevel: ExperienceLevel;
  status: JobStatus;
  candidateIds: string[];
  teamId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type SortOption = "score" | "name" | "experience" | "uploadDate";
export type SortDirection = "asc" | "desc";

export interface FilterState {
  skills: string[];
  minScore: number;
  maxExperience?: number;
  minExperience?: number;
  searchQuery: string;
}
