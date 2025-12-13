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
};
