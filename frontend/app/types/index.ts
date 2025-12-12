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

export interface Team {
  id: string;
  name: string;
  candidates: Candidate[];
  compatibilityScore: number;
  targetRole?: string;
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
