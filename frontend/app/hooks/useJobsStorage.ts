"use client";

import { useState, useEffect, useCallback } from "react";
import type { Job, JobStatus, ExperienceLevel, JobSkill } from "../types";

const STORAGE_KEY = "fastboard_jobs";

interface StoredJob {
  id: string;
  title: string;
  description?: string;
  location?: string;
  requiredSkills: JobSkill[];
  experienceLevel: string;
  status: string;
  candidateIds: string[];
  teamId?: string;
  createdAt: string;
  updatedAt: string;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

function resolveJob(stored: StoredJob): Job {
  return {
    id: stored.id,
    title: stored.title,
    description: stored.description,
    location: stored.location,
    requiredSkills: stored.requiredSkills,
    experienceLevel: stored.experienceLevel as ExperienceLevel,
    status: stored.status as JobStatus,
    candidateIds: stored.candidateIds,
    teamId: stored.teamId,
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
  };
}

function toStoredJob(job: Job): StoredJob {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    location: job.location,
    requiredSkills: job.requiredSkills,
    experienceLevel: job.experienceLevel,
    status: job.status,
    candidateIds: job.candidateIds,
    teamId: job.teamId,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
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

export function useJobsStorage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load jobs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const storedJobs: StoredJob[] = JSON.parse(stored);
        const resolvedJobs = storedJobs.map(resolveJob);
        setJobs(resolvedJobs);
      }
    } catch (error) {
      console.error("Failed to load jobs from localStorage:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Persist jobs to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        const storedJobs = jobs.map(toStoredJob);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storedJobs));
      } catch (error) {
        console.error("Failed to save jobs to localStorage:", error);
      }
    }
  }, [jobs, isLoading]);

  const createJob = useCallback((data: CreateJobData): Job => {
    const now = new Date();
    const newJob: Job = {
      id: generateId(),
      title: data.title,
      description: data.description,
      location: data.location,
      requiredSkills: data.requiredSkills || [],
      experienceLevel: data.experienceLevel || "any",
      status: "sourcing",
      candidateIds: [],
      createdAt: now,
      updatedAt: now,
    };

    setJobs((prev) => [...prev, newJob]);
    return newJob;
  }, []);

  const updateJob = useCallback((jobId: string, updates: UpdateJobData) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? { ...job, ...updates, updatedAt: new Date() }
          : job
      )
    );
  }, []);

  const deleteJob = useCallback((jobId: string) => {
    setJobs((prev) => prev.filter((job) => job.id !== jobId));
  }, []);

  const addCandidatesToJob = useCallback(
    (jobId: string, candidateIds: string[]) => {
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

  const linkTeamToJob = useCallback((jobId: string, teamId: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? { ...job, teamId, updatedAt: new Date() }
          : job
      )
    );
  }, []);

  const unlinkTeamFromJob = useCallback((jobId: string) => {
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
