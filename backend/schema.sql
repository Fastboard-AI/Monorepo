-- FastboardAI Database Schema
-- Run this in your Neon SQL console: https://console.neon.tech

-- ============================================
-- Teams table
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  target_role VARCHAR,
  compatibility_score INT DEFAULT 75,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Team Members table
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  role VARCHAR NOT NULL,
  skills JSONB DEFAULT '[]',
  experience_level VARCHAR DEFAULT 'mid',
  work_style JSONB DEFAULT '{"communication":"mixed","collaboration":"balanced","pace":"steady"}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Jobs table
-- ============================================
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  description TEXT,
  location VARCHAR,
  required_skills JSONB DEFAULT '[]',
  experience_level VARCHAR DEFAULT 'any',
  status VARCHAR DEFAULT 'sourcing',
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Candidates table (for AI code analysis)
-- ============================================
CREATE TABLE IF NOT EXISTS candidates (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  degrees JSON NOT NULL DEFAULT '[]',
  style JSON NOT NULL DEFAULT '{}',
  github VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  stacks JSON NOT NULL DEFAULT '[]',
  employed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Sourced Candidates table (from AI Sourcing & Resume Matcher)
-- ============================================
CREATE TABLE IF NOT EXISTS sourced_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  email VARCHAR,
  phone VARCHAR,
  location VARCHAR,
  title VARCHAR NOT NULL,
  skills JSONB DEFAULT '[]',
  experience JSONB DEFAULT '[]',
  education JSONB DEFAULT '[]',
  links JSONB DEFAULT '{}',
  talent_fit_score INT DEFAULT 0,
  score_breakdown JSONB DEFAULT '{}',
  resume_file_name VARCHAR,
  source VARCHAR DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Job Candidates junction table
-- ============================================
CREATE TABLE IF NOT EXISTS job_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES sourced_candidates(id) ON DELETE CASCADE,
  job_match_score INT DEFAULT 0,
  team_compatibility_score INT DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, candidate_id)
);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_jobs_team_id ON jobs(team_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_teams_created_at ON teams(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sourced_candidates_created_at ON sourced_candidates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_candidates_job_id ON job_candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_job_candidates_candidate_id ON job_candidates(candidate_id);

-- ============================================
-- Done!
-- ============================================
-- Tables created:
--   - teams
--   - team_members
--   - jobs
--   - candidates
--   - sourced_candidates
--   - job_candidates
