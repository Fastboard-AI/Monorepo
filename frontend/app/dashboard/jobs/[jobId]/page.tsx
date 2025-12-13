"use client";

import { useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Clock,
  Users,
  Sparkles,
  Pencil,
  Trash2,
  GitCompare,
  FileText,
} from "lucide-react";

import { Header } from "../../../components/Header";
import { JobsNavBar } from "../../../components/JobsNavBar";
import { SelectableCandidateCard } from "../../../components/SelectableCandidateCard";
import { CandidateDetailModal } from "../../../components/CandidateDetailModal";
import { CandidateComparisonPanel } from "../../../components/CandidateComparisonPanel";
import { ExportDropdown } from "../../../components/ExportDropdown";
import { EditJobModal } from "../../../components/EditJobModal";
import { DeleteConfirmModal } from "../../../components/DeleteConfirmModal";
import { SourceCandidatesModal } from "../../../components/SourceCandidatesModal";
import { JobTeamPanel } from "../../../components/JobTeamPanel";
import { useJobsStorage } from "../../../hooks/useJobsStorage";
import { useTeamsStorage } from "../../../hooks/useTeamsStorage";
import { mockCandidates } from "../../../data/mockCandidates";
import type { Candidate, Job, Team, ExperienceLevel, JobStatus } from "../../../types";

const statusConfig: Record<Job["status"], { label: string; className: string }> = {
  sourcing: {
    label: "Sourcing",
    className: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
  reviewing: {
    label: "Reviewing",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  filled: {
    label: "Filled",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  closed: {
    label: "Closed",
    className: "bg-slate-100 text-slate-500 border-slate-200",
  },
};

const experienceLabels: Record<Job["experienceLevel"], string> = {
  any: "Any Level",
  entry: "Entry Level",
  mid: "Mid Level",
  senior: "Senior",
  lead: "Lead/Principal",
};

export default function JobDetailPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const {
    jobs,
    isLoading,
    updateJob,
    deleteJob,
    addCandidatesToJob,
    removeCandidateFromJob,
    getJobById,
    linkTeamToJob,
    unlinkTeamFromJob,
  } = useJobsStorage();

  const {
    teams,
    isLoading: teamsLoading,
    getTeamById,
  } = useTeamsStorage();

  const job = getJobById(jobId);
  const linkedTeam = job?.teamId ? getTeamById(job.teamId) ?? null : null;

  // Get candidates for this job
  const jobCandidates = useMemo(() => {
    if (!job) return [];
    return job.candidateIds
      .map((id) => mockCandidates.find((c) => c.id === id))
      .filter((c): c is Candidate => c !== undefined);
  }, [job]);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [comparisonCandidates, setComparisonCandidates] = useState<Candidate[]>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  // Modal states
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);

  // Selection handlers
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Comparison handlers
  const handleAddToComparison = useCallback((candidate: Candidate) => {
    setComparisonCandidates((prev) => {
      if (prev.some((c) => c.id === candidate.id)) {
        return prev.filter((c) => c.id !== candidate.id);
      }
      if (prev.length >= 3) return prev;
      return [...prev, candidate];
    });
  }, []);

  const handleRemoveFromComparison = useCallback((id: string) => {
    setComparisonCandidates((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Job action handlers
  const handleSaveJob = useCallback(
    (
      id: string,
      updates: {
        title?: string;
        description?: string;
        location?: string;
        requiredSkills?: string[];
        experienceLevel?: ExperienceLevel;
        status?: JobStatus;
      }
    ) => {
      updateJob(id, updates);
      setIsEditModalOpen(false);
    },
    [updateJob]
  );

  const handleConfirmDelete = useCallback(() => {
    deleteJob(jobId);
    router.push("/dashboard/jobs");
  }, [deleteJob, jobId, router]);

  const handleRemoveCandidate = useCallback(
    (candidateId: string) => {
      removeCandidateFromJob(jobId, candidateId);
      setComparisonCandidates((prev) => prev.filter((c) => c.id !== candidateId));
    },
    [jobId, removeCandidateFromJob]
  );

  const handleStartSourcing = useCallback(
    (criteria: {
      jobTitle: string;
      skills: string[];
      location?: string;
      experienceLevel: ExperienceLevel;
      sources: ("linkedin" | "github" | "portfolio")[];
    }) => {
      // Simulate adding some mock candidates
      const availableIds = mockCandidates
        .filter((c) => !job?.candidateIds.includes(c.id))
        .map((c) => c.id);
      const newIds = availableIds.slice(0, Math.floor(Math.random() * 3) + 1);
      addCandidatesToJob(jobId, newIds);
      setIsSourceModalOpen(false);
    },
    [addCandidatesToJob, job?.candidateIds, jobId]
  );

  // Team handlers
  const handleSelectTeam = useCallback(
    (team: Team | null) => {
      if (team) {
        linkTeamToJob(jobId, team.id);
      } else {
        unlinkTeamFromJob(jobId);
      }
    },
    [jobId, linkTeamToJob, unlinkTeamFromJob]
  );

  const handleUnlinkTeam = useCallback(() => {
    unlinkTeamFromJob(jobId);
  }, [jobId, unlinkTeamFromJob]);

  if (!isLoaded || isLoading || teamsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <JobsNavBar />
        <main className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
          <Briefcase className="mx-auto h-16 w-16 text-slate-300" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Job not found</h1>
          <p className="mt-2 text-slate-600">
            This job may have been deleted or doesn't exist.
          </p>
          <button
            onClick={() => router.push("/dashboard/jobs")}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </button>
        </main>
      </div>
    );
  }

  const status = statusConfig[job.status];
  const createdDate = new Date(job.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <JobsNavBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Back button */}
        <button
          onClick={() => router.push("/dashboard/jobs")}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </button>

        {/* Job Header */}
        <div className="mb-8 rounded-xl border border-slate-100 bg-white p-6 shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg">
                <Briefcase className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-900">{job.title}</h1>
                  <span
                    className={`rounded-full border px-3 py-0.5 text-sm font-medium ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                  {job.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {job.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-slate-400" />
                    {jobCandidates.length} candidates
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-slate-400" />
                    Created {createdDate}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    {experienceLabels[job.experienceLevel]}
                  </span>
                </div>
                {job.description && (
                  <p className="mt-3 max-w-2xl text-slate-600">{job.description}</p>
                )}
                {job.requiredSkills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {job.requiredSkills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSourceModalOpen(true)}
                className="btn-lift flex items-center gap-2 rounded-lg gradient-bg px-4 py-2 text-sm font-medium text-white shadow-button"
              >
                <Sparkles className="h-4 w-4" />
                Source Candidates
              </button>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                title="Edit job"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-red-50 hover:text-red-600"
                title="Delete job"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Team Panel */}
        <div className="mb-8">
          <JobTeamPanel
            job={job}
            team={linkedTeam}
            teams={teams}
            isLoadingTeams={teamsLoading}
            onSelectTeam={handleSelectTeam}
            onUnlinkTeam={handleUnlinkTeam}
          />
        </div>

        {/* Candidates Section */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Sourced Candidates ({jobCandidates.length})
          </h2>
          <div className="flex items-center gap-3">
            {comparisonCandidates.length >= 2 && (
              <button
                onClick={() => setIsComparisonOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100"
              >
                <GitCompare className="h-4 w-4" />
                Compare ({comparisonCandidates.length})
              </button>
            )}
            <ExportDropdown candidates={jobCandidates} selectedIds={selectedIds} />
          </div>
        </div>

        {/* Candidates List */}
        {jobCandidates.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-lg font-medium text-slate-600">
              No candidates sourced yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Click "Source Candidates" to find talent for this role
            </p>
            <button
              onClick={() => setIsSourceModalOpen(true)}
              className="btn-lift mt-6 inline-flex items-center gap-2 rounded-lg gradient-bg px-5 py-2.5 text-sm font-semibold text-white shadow-button"
            >
              <Sparkles className="h-5 w-5" />
              Source Candidates
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {jobCandidates.map((candidate) => (
              <div key={candidate.id} className="relative">
                <SelectableCandidateCard
                  candidate={candidate}
                  isSelected={selectedIds.has(candidate.id)}
                  onToggleSelect={handleToggleSelect}
                  onCompare={handleAddToComparison}
                  onClick={() => {
                    setSelectedCandidate(candidate);
                    setIsDetailModalOpen(true);
                  }}
                  isInComparison={comparisonCandidates.some(
                    (c) => c.id === candidate.id
                  )}
                  comparisonDisabled={comparisonCandidates.length >= 3}
                />
                <button
                  onClick={() => handleRemoveCandidate(candidate.id)}
                  className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 sm:opacity-100"
                  title="Remove from job"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <CandidateDetailModal
        candidate={selectedCandidate}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedCandidate(null);
        }}
      />

      <CandidateComparisonPanel
        candidates={comparisonCandidates}
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        onRemoveCandidate={handleRemoveFromComparison}
      />

      <EditJobModal
        job={job}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSaveJob={handleSaveJob}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Job"
        message={`Are you sure you want to delete "${job.title}"? All sourced candidates will be unlinked. This action cannot be undone.`}
        confirmLabel="Delete Job"
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      <SourceCandidatesModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        onStartSourcing={handleStartSourcing}
      />
    </div>
  );
}
