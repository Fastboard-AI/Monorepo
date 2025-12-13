"use client";

import { useState, useEffect, useCallback } from "react";
import type { Job, JobStatus, ExperienceLevel } from "../types";
import { api, ApiJob } from "../lib/api";

// Convert API response to frontend Job type
function apiToJob(apiJob: ApiJob): Job {
  return {
    id: apiJob.id,
    title: apiJob.title,
    description: apiJob.description || undefined,
    location: apiJob.location || undefined,
    requiredSkills: apiJob.required_skills,
    experienceLevel: apiJob.experience_level as ExperienceLevel,
    status: apiJob.status as JobStatus,
    candidateIds: apiJob.candidate_ids,
    teamId: apiJob.team_id || undefined,
    createdAt: new Date(apiJob.created_at),
    updatedAt: new Date(apiJob.updated_at),
  };
}

export interface CreateJobData {
  title: string;
  description?: string;
  location?: string;
  requiredSkills?: string[];
  experienceLevel?: ExperienceLevel;
}

export interface UpdateJobData {
  title?: string;
  description?: string;
  location?: string;
  requiredSkills?: string[];
  experienceLevel?: ExperienceLevel;
  status?: JobStatus;
}

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load jobs from API on mount
  useEffect(() => {
    api.getJobs()
      .then((data) => {
        setJobs(data.map(apiToJob));
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to load jobs:", err);
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const createJob = useCallback(async (data: CreateJobData): Promise<Job> => {
    const apiJob = await api.createJob({
      title: data.title,
      description: data.description,
      location: data.location,
      required_skills: data.requiredSkills || [],
      experience_level: data.experienceLevel || "any",
    });

    const newJob = apiToJob(apiJob);
    setJobs((prev) => [...prev, newJob]);
    return newJob;
  }, []);

  const updateJob = useCallback(async (jobId: string, updates: UpdateJobData) => {
    await api.updateJob(jobId, {
      title: updates.title,
      description: updates.description,
      location: updates.location,
      required_skills: updates.requiredSkills,
      experience_level: updates.experienceLevel,
      status: updates.status,
    });

    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? { ...job, ...updates, updatedAt: new Date() }
          : job
      )
    );
  }, []);

  const deleteJob = useCallback(async (jobId: string) => {
    await api.deleteJob(jobId);
    setJobs((prev) => prev.filter((job) => job.id !== jobId));
  }, []);

  const addCandidatesToJob = useCallback(
    (jobId: string, candidateIds: string[]) => {
      // Note: This is currently client-side only
      // TODO: Add backend endpoint for job_candidates
      setJobs((prev) =>
        prev.map((job) => {
          if (job.id !== jobId) return job;

          const existingIds = new Set(job.candidateIds);
          const newIds = candidateIds.filter((id) => !existingIds.has(id));
          const updatedCandidateIds = [...job.candidateIds, ...newIds];

          return {
            ...job,
            candidateIds: updatedCandidateIds,
            updatedAt: new Date(),
          };
        })
      );
    },
    []
  );

  const removeCandidateFromJob = useCallback(
    (jobId: string, candidateId: string) => {
      // Note: This is currently client-side only
      setJobs((prev) =>
        prev.map((job) => {
          if (job.id !== jobId) return job;

          return {
            ...job,
            candidateIds: job.candidateIds.filter((id) => id !== candidateId),
            updatedAt: new Date(),
          };
        })
      );
    },
    []
  );

  const getJobById = useCallback(
    (jobId: string): Job | undefined => {
      return jobs.find((job) => job.id === jobId);
    },
    [jobs]
  );

  const linkTeamToJob = useCallback(async (jobId: string, teamId: string) => {
    await api.updateJob(jobId, { team_id: teamId });
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? { ...job, teamId, updatedAt: new Date() }
          : job
      )
    );
  }, []);

  const unlinkTeamFromJob = useCallback(async (jobId: string) => {
    await api.updateJob(jobId, { team_id: "" });
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? { ...job, teamId: undefined, updatedAt: new Date() }
          : job
      )
    );
  }, []);

  return {
    jobs,
    isLoading,
    error,
    createJob,
    updateJob,
    deleteJob,
    addCandidatesToJob,
    removeCandidateFromJob,
    getJobById,
    linkTeamToJob,
    unlinkTeamFromJob,
  };
}
