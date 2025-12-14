-- FastboardAI Database Schema
-- Run this in your Neon SQL console: https://console.neon.tech

-- ============================================
-- Enable pgvector extension (for embeddings)
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;

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
  github VARCHAR,
  linkedin VARCHAR,
  website VARCHAR,
  code_characteristics JSONB DEFAULT NULL,
  github_stats JSONB DEFAULT NULL,
  -- AI Analysis fields
  ai_detection_score FLOAT,
  ai_proficiency_score FLOAT,
  code_authenticity_score FLOAT,
  ai_analysis_details JSONB,
  developer_profile TEXT,
  analysis_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: Add AI analysis columns to existing team_members table
-- ALTER TABLE team_members ADD COLUMN IF NOT EXISTS github VARCHAR;
-- ALTER TABLE team_members ADD COLUMN IF NOT EXISTS linkedin VARCHAR;
-- ALTER TABLE team_members ADD COLUMN IF NOT EXISTS website VARCHAR;
-- ALTER TABLE team_members ADD COLUMN IF NOT EXISTS code_characteristics JSONB DEFAULT NULL;
-- ALTER TABLE team_members ADD COLUMN IF NOT EXISTS github_stats JSONB DEFAULT NULL;
-- ALTER TABLE team_members ADD COLUMN IF NOT EXISTS ai_detection_score FLOAT;
-- ALTER TABLE team_members ADD COLUMN IF NOT EXISTS ai_proficiency_score FLOAT;
-- ALTER TABLE team_members ADD COLUMN IF NOT EXISTS code_authenticity_score FLOAT;
-- ALTER TABLE team_members ADD COLUMN IF NOT EXISTS ai_analysis_details JSONB;
-- ALTER TABLE team_members ADD COLUMN IF NOT EXISTS developer_profile TEXT;
-- ALTER TABLE team_members ADD COLUMN IF NOT EXISTS analysis_metadata JSONB;

-- ============================================
-- Jobs table
-- ============================================
-- required_skills format:
--   Legacy: ["Python", "React"]
--   Enhanced: [{"name": "Python", "level": "advanced", "mandatory": true}]
-- Both formats are supported - legacy strings treated as mandatory/intermediate
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
  -- GitHub enrichment fields (auto-populated async when GitHub link present)
  code_characteristics JSONB DEFAULT NULL,
  ai_detection_score FLOAT,
  ai_proficiency_score FLOAT,
  code_authenticity_score FLOAT,
  ai_analysis_details JSONB,
  developer_profile TEXT,
  analysis_metadata JSONB,
  github_stats JSONB,
  analysis_status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: Add GitHub enrichment columns to existing sourced_candidates table
-- ALTER TABLE sourced_candidates ADD COLUMN IF NOT EXISTS code_characteristics JSONB DEFAULT NULL;
-- ALTER TABLE sourced_candidates ADD COLUMN IF NOT EXISTS ai_detection_score FLOAT;
-- ALTER TABLE sourced_candidates ADD COLUMN IF NOT EXISTS ai_proficiency_score FLOAT;
-- ALTER TABLE sourced_candidates ADD COLUMN IF NOT EXISTS code_authenticity_score FLOAT;
-- ALTER TABLE sourced_candidates ADD COLUMN IF NOT EXISTS ai_analysis_details JSONB;
-- ALTER TABLE sourced_candidates ADD COLUMN IF NOT EXISTS developer_profile TEXT;
-- ALTER TABLE sourced_candidates ADD COLUMN IF NOT EXISTS analysis_metadata JSONB;
-- ALTER TABLE sourced_candidates ADD COLUMN IF NOT EXISTS github_stats JSONB;
-- ALTER TABLE sourced_candidates ADD COLUMN IF NOT EXISTS analysis_status VARCHAR DEFAULT 'pending';

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
-- Code Embeddings table (ephemeral - for analysis sessions)
-- ============================================
CREATE TABLE IF NOT EXISTS code_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL,
  username VARCHAR NOT NULL,
  repo_name VARCHAR NOT NULL,
  file_path VARCHAR NOT NULL,
  line_start INT NOT NULL,
  line_end INT NOT NULL,
  language VARCHAR,
  content TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT NOW()
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
CREATE INDEX IF NOT EXISTS idx_code_embeddings_analysis_id ON code_embeddings(analysis_id);
CREATE INDEX IF NOT EXISTS idx_code_embeddings_embedding ON code_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

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
--   - code_embeddings (ephemeral)
