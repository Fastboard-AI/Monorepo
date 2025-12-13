"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import {
  Briefcase,
  Users,
  Target,
  TrendingUp,
  Search,
  Plus,
} from "lucide-react";

import { Header } from "../../components/Header";
import { JobCard } from "../../components/JobCard";
import { CreateJobModal } from "../../components/CreateJobModal";
import { EditJobModal } from "../../components/EditJobModal";
import { DeleteConfirmModal } from "../../components/DeleteConfirmModal";
import { useJobs } from "../../hooks/useJobs";
import type { Job, ExperienceLevel, JobStatus } from "../../types";

export default function JobsPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const {
    jobs,
    isLoading,
    createJob,
    updateJob,
    deleteJob,
  } = useJobs();

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Selected job for operations
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    if (!searchQuery) return jobs;
    const query = searchQuery.toLowerCase();
    return jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(query) ||
        j.location?.toLowerCase().includes(query) ||
        j.requiredSkills.some((s) => s.toLowerCase().includes(query))
    );
  }, [jobs, searchQuery]);

  // Stats
  const openJobsCount = useMemo(
    () => jobs.filter((j) => j.status === "sourcing" || j.status === "reviewing").length,
    [jobs]
  );

  const totalCandidates = useMemo(
    () => jobs.reduce((sum, j) => sum + j.candidateIds.length, 0),
    [jobs]
  );

  const avgCandidatesPerJob = useMemo(() => {
    if (jobs.length === 0) return 0;
    return Math.round(totalCandidates / jobs.length);
  }, [jobs.length, totalCandidates]);

  // Handlers
  const handleCreateJob = useCallback(
    async (data: {
      title: string;
      description?: string;
      location?: string;
      requiredSkills?: string[];
      experienceLevel?: ExperienceLevel;
    }) => {
      const newJob = await createJob(data);
      router.push(`/dashboard/jobs/${newJob.id}`);
    },
    [createJob, router]
  );

  const handleEditJob = useCallback((job: Job) => {
    setSelectedJob(job);
    setIsEditModalOpen(true);
  }, []);

  const handleSaveJob = useCallback(
    async (
      jobId: string,
      updates: {
        title?: string;
        description?: string;
        location?: string;
        requiredSkills?: string[];
        experienceLevel?: ExperienceLevel;
        status?: JobStatus;
      }
    ) => {
      await updateJob(jobId, updates);
      setIsEditModalOpen(false);
      setSelectedJob(null);
    },
    [updateJob]
  );

  const handleDeleteClick = useCallback((job: Job) => {
    setSelectedJob(job);
    setIsDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (selectedJob) {
      await deleteJob(selectedJob.id);
      setIsDeleteModalOpen(false);
      setSelectedJob(null);
    }
  }, [deleteJob, selectedJob]);

  const handleViewDetails = useCallback(
    (job: Job) => {
      router.push(`/dashboard/jobs/${job.id}`);
    },
    [router]
  );

  if (!isLoaded || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Page Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Job <span className="gradient-text">Management</span>
            </h1>
            <p className="mt-2 text-slate-600">
              Create jobs and source candidates for your open positions.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-lift flex items-center gap-2 rounded-lg gradient-bg px-5 py-2.5 text-sm font-semibold text-white shadow-button"
          >
            <Plus className="h-5 w-5" />
            Create Job
          </button>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card-lift rounded-xl border border-slate-100 bg-white p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                <Briefcase className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{jobs.length}</p>
                <p className="text-sm text-slate-500">Total Jobs</p>
              </div>
            </div>
          </div>

          <div className="card-lift rounded-xl border border-slate-100 bg-white p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <Target className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {openJobsCount}
                </p>
                <p className="text-sm text-slate-500">Open Positions</p>
              </div>
            </div>
          </div>

          <div className="card-lift rounded-xl border border-slate-100 bg-white p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
                <Users className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {totalCandidates}
                </p>
                <p className="text-sm text-slate-500">Total Sourced</p>
              </div>
            </div>
          </div>

          <div className="card-lift rounded-xl border border-slate-100 bg-white p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {avgCandidatesPerJob}
                </p>
                <p className="text-sm text-slate-500">Avg per Job</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Jobs Grid */}
        {filteredJobs.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
            <Briefcase className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-lg font-medium text-slate-600">
              {searchQuery ? "No jobs match your search" : "No jobs yet"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {searchQuery
                ? "Try a different search term"
                : "Create your first job to start sourcing candidates"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-lift mt-6 inline-flex items-center gap-2 rounded-lg gradient-bg px-5 py-2.5 text-sm font-semibold text-white shadow-button"
              >
                <Plus className="h-5 w-5" />
                Create Job
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onEdit={handleEditJob}
                onDelete={handleDeleteClick}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <CreateJobModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateJob={handleCreateJob}
      />

      <EditJobModal
        job={selectedJob}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedJob(null);
        }}
        onSaveJob={handleSaveJob}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Job"
        message={`Are you sure you want to delete "${selectedJob?.title}"? All sourced candidates will be unlinked. This action cannot be undone.`}
        confirmLabel="Delete Job"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setSelectedJob(null);
        }}
      />
    </div>
  );
}
