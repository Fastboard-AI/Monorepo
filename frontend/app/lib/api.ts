const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Helper for fetch with error handling
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// Jobs API
export interface ApiJob {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  required_skills: string[];
  experience_level: string;
  status: string;
  team_id: string | null;
  candidate_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateJobInput {
  title: string;
  description?: string;
  location?: string;
  required_skills: string[];
  experience_level: string;
}

export interface UpdateJobInput {
  title?: string;
  description?: string;
  location?: string;
  required_skills?: string[];
  experience_level?: string;
  status?: string;
  team_id?: string;
}

// Teams API
export interface ApiTeamMember {
  id: string;
  name: string;
  role: string;
  skills: { name: string; level: string }[];
  experience_level: string;
  work_style: {
    communication: string;
    collaboration: string;
    pace: string;
  };
  github?: string;
  linkedin?: string;
  website?: string;
  code_characteristics?: {
    avg_lines_per_function: number;
    functional_vs_oop_ratio: number;
    recursion_vs_loop_ratio: number;
    dependency_coupling_index: number;
    modularity_index_score: number;
    avg_nesting_depth: number;
    abstraction_layer_count: number;
    immutability_score: number;
    error_handling_centralization_score: number;
    test_structure_modularity_ratio: number;
  };
}

export interface ApiTeam {
  id: string;
  name: string;
  target_role: string | null;
  compatibility_score: number;
  members: ApiTeamMember[];
  created_at: string;
  updated_at: string;
}

export interface CreateTeamInput {
  name: string;
  target_role?: string;
}

export interface UpdateTeamInput {
  name?: string;
  target_role?: string;
  compatibility_score?: number;
}

export interface CreateTeamMemberInput {
  name: string;
  role: string;
  skills: { name: string; level: string }[];
  experience_level: string;
  work_style: {
    communication: string;
    collaboration: string;
    pace: string;
  };
  github?: string;
  linkedin?: string;
  website?: string;
}

export interface UpdateTeamMemberInput {
  name?: string;
  role?: string;
  skills?: { name: string; level: string }[];
  experience_level?: string;
  work_style?: {
    communication: string;
    collaboration: string;
    pace: string;
  };
  github?: string;
  linkedin?: string;
  website?: string;
}

// Sourcing API
export interface SourcingRequest {
  job_id: string;
  team_id?: string;
  sources: string[];
  count: number;
}

export interface SourcedCandidate {
  id: string;
  name: string;
  title: string;
  location: string;
  skills: { name: string; level: string; match_type: string }[];
  experience: { title: string; company: string; duration: string; description: string }[];
  education: { degree: string; institution: string; year: string }[];
  links: { github?: string; linkedin?: string; portfolio?: string };
  talent_fit_score: number;
  score_breakdown: { skills: number; experience: number; culture: number };
  source: string;
}

// Candidates API
export interface ApiCandidateSkill {
  name: string;
  level: string;
}

export interface ApiCandidateExperience {
  title: string;
  company: string;
  duration: string;
  description?: string;
}

export interface ApiCandidateEducation {
  degree: string;
  institution: string;
  year: string;
}

export interface ApiCandidateLinks {
  github?: string;
  linkedin?: string;
  portfolio?: string;
}

export interface ApiScoreBreakdown {
  skillsMatch: number;
  experienceMatch: number;
  workStyleAlignment: number;
  teamFit: number;
}

export interface ApiCandidate {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  title: string;
  skills: ApiCandidateSkill[];
  experience: ApiCandidateExperience[];
  education: ApiCandidateEducation[];
  links: ApiCandidateLinks;
  talent_fit_score: number;
  score_breakdown: ApiScoreBreakdown;
  resume_file_name: string | null;
  source: string;
  created_at: string;
}

export interface CreateCandidateInput {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  title: string;
  skills: ApiCandidateSkill[];
  experience: ApiCandidateExperience[];
  education: ApiCandidateEducation[];
  links: ApiCandidateLinks;
  talent_fit_score: number;
  score_breakdown: ApiScoreBreakdown;
  resume_file_name?: string;
  source: string;
}

export interface JobCandidateResponse {
  id: string;
  candidate: ApiCandidate;
  job_match_score: number;
  team_compatibility_score: number;
  added_at: string;
}

export interface LinkCandidateInput {
  candidate_id: string;
  job_match_score?: number;
  team_compatibility_score?: number;
}

export const api = {
  // Jobs
  getJobs: (): Promise<ApiJob[]> =>
    fetchJson(`${API_BASE}/api/jobs`),

  getJob: (id: string): Promise<ApiJob> =>
    fetchJson(`${API_BASE}/api/jobs/${id}`),

  createJob: (data: CreateJobInput): Promise<ApiJob> =>
    fetchJson(`${API_BASE}/api/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  updateJob: (id: string, data: UpdateJobInput): Promise<{ success: boolean; id: string }> =>
    fetchJson(`${API_BASE}/api/jobs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  deleteJob: (id: string): Promise<{ success: boolean; id: string }> =>
    fetchJson(`${API_BASE}/api/jobs/${id}`, {
      method: "DELETE",
    }),

  // Teams
  getTeams: (): Promise<ApiTeam[]> =>
    fetchJson(`${API_BASE}/api/teams`),

  getTeam: (id: string): Promise<ApiTeam> =>
    fetchJson(`${API_BASE}/api/teams/${id}`),

  createTeam: (data: CreateTeamInput): Promise<ApiTeam> =>
    fetchJson(`${API_BASE}/api/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  updateTeam: (id: string, data: UpdateTeamInput): Promise<{ success: boolean; id: string }> =>
    fetchJson(`${API_BASE}/api/teams/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  deleteTeam: (id: string): Promise<{ success: boolean; id: string }> =>
    fetchJson(`${API_BASE}/api/teams/${id}`, {
      method: "DELETE",
    }),

  addTeamMember: (teamId: string, data: CreateTeamMemberInput): Promise<ApiTeamMember> =>
    fetchJson(`${API_BASE}/api/teams/${teamId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  updateTeamMember: (
    teamId: string,
    memberId: string,
    data: UpdateTeamMemberInput
  ): Promise<ApiTeamMember> =>
    fetchJson(`${API_BASE}/api/teams/${teamId}/members/${memberId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  removeTeamMember: (teamId: string, memberId: string): Promise<{ success: boolean; id: string }> =>
    fetchJson(`${API_BASE}/api/teams/${teamId}/members/${memberId}`, {
      method: "DELETE",
    }),

  // Sourcing
  searchCandidates: (params: SourcingRequest): Promise<SourcedCandidate[]> =>
    fetchJson(`${API_BASE}/api/sourcing/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    }),

  // Candidates
  createCandidate: (data: CreateCandidateInput): Promise<ApiCandidate> =>
    fetchJson(`${API_BASE}/api/candidates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  getJobCandidates: (jobId: string): Promise<JobCandidateResponse[]> =>
    fetchJson(`${API_BASE}/api/jobs/${jobId}/candidates`),

  addCandidateToJob: (
    jobId: string,
    data: LinkCandidateInput
  ): Promise<{ success: boolean; id: string; candidate_id: string }> =>
    fetchJson(`${API_BASE}/api/jobs/${jobId}/candidates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  removeCandidateFromJob: (
    jobId: string,
    candidateId: string
  ): Promise<{ success: boolean }> =>
    fetchJson(`${API_BASE}/api/jobs/${jobId}/candidates/${candidateId}`, {
      method: "DELETE",
    }),
};
