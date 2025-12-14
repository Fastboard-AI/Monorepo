"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Clock,
  Users,
  Pencil,
  Trash2,
  GitCompare,
  FileText,
  FileCode,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { Header } from "../../../components/Header";
import { SelectableCandidateCard } from "../../../components/SelectableCandidateCard";
import { CandidateDetailModal } from "../../../components/CandidateDetailModal";
import { CandidateComparisonPanel } from "../../../components/CandidateComparisonPanel";
import { ExportDropdown } from "../../../components/ExportDropdown";
import { EditJobModal } from "../../../components/EditJobModal";
import { DeleteConfirmModal } from "../../../components/DeleteConfirmModal";
import { JobTeamPanel } from "../../../components/JobTeamPanel";
import { useJobs } from "../../../hooks/useJobs";
import { useTeams } from "../../../hooks/useTeams";
import { api, JobCandidateResponse, TakeHomeProjects } from "../../../lib/api";
import type { Candidate, Job, Team, ExperienceLevel, JobStatus, JobSkill } from "../../../types";
import { getSkillName } from "../../../types";

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
    isLoading,
    updateJob,
    deleteJob,
    getJobById,
    linkTeamToJob,
    unlinkTeamFromJob,
  } = useJobs();

  const {
    teams,
    isLoading: teamsLoading,
    getTeamById,
    updateTeamMember,
  } = useTeams();

  const job = getJobById(jobId);
  const linkedTeam = job?.teamId ? getTeamById(job.teamId) ?? null : null;

  // Candidates state
  const [jobCandidates, setJobCandidates] = useState<Candidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);

  // Take-home projects state
  const [takeHomeProjects, setTakeHomeProjects] = useState<Record<string, TakeHomeProjects>>({});
  const [generatingTakeHome, setGeneratingTakeHome] = useState<Set<string>>(new Set());
  const [expandedTakeHome, setExpandedTakeHome] = useState<Set<string>>(new Set());

  // Fetch candidates from API
  useEffect(() => {
    if (!job) return;

    const fetchCandidates = async () => {
      setCandidatesLoading(true);
      try {
        const response = await api.getJobCandidates(job.id);
        const candidates: Candidate[] = response.map((jc: JobCandidateResponse) => ({
          id: jc.candidate.id,
          name: jc.candidate.name,
          email: jc.candidate.email || undefined,
          title: jc.candidate.title,
          skills: jc.candidate.skills.map((s) => ({
            name: s.name,
            level: s.level as "beginner" | "intermediate" | "advanced" | "expert",
          })),
          experience: jc.candidate.experience.map((e) => ({
            title: e.title,
            company: e.company,
            duration: e.duration,
            description: e.description,
          })),
          education: jc.candidate.education.map((e) => ({
            degree: e.degree,
            institution: e.institution,
            year: e.year,
          })),
          links: jc.candidate.links || {},
          talentFitScore: jc.candidate.talent_fit_score,
          scoreBreakdown: {
            skillsMatch: jc.candidate.score_breakdown.skillsMatch,
            experienceMatch: jc.candidate.score_breakdown.experienceMatch,
            workStyleAlignment: jc.candidate.score_breakdown.workStyleAlignment,
            teamFit: jc.candidate.score_breakdown.teamFit,
          },
          resumeFileName: jc.candidate.resume_file_name || undefined,
          uploadedAt: new Date(jc.candidate.created_at),
          // GitHub enrichment fields
          aiDetectionScore: jc.candidate.ai_detection_score ?? undefined,
          aiProficiencyScore: jc.candidate.ai_proficiency_score ?? undefined,
          codeAuthenticityScore: jc.candidate.code_authenticity_score ?? undefined,
          developerProfile: jc.candidate.developer_profile ?? undefined,
          analysisStatus: (jc.candidate.analysis_status as "pending" | "analyzing" | "complete" | "failed") || "complete",
        }));
        setJobCandidates(candidates);
      } catch (error) {
        console.error("Failed to fetch candidates:", error);
      } finally {
        setCandidatesLoading(false);
      }
    };

    fetchCandidates();
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
    async (
      id: string,
      updates: {
        title?: string;
        description?: string;
        location?: string;
        requiredSkills?: JobSkill[];
        experienceLevel?: ExperienceLevel;
        status?: JobStatus;
      }
    ) => {
      await updateJob(id, updates);
      setIsEditModalOpen(false);
    },
    [updateJob]
  );

  const handleConfirmDelete = useCallback(async () => {
    await deleteJob(jobId);
    router.push("/dashboard/jobs");
  }, [deleteJob, jobId, router]);

  const handleRemoveCandidate = useCallback(
    async (candidateId: string) => {
      try {
        await api.removeCandidateFromJob(jobId, candidateId);
        setJobCandidates((prev) => prev.filter((c) => c.id !== candidateId));
        setComparisonCandidates((prev) => prev.filter((c) => c.id !== candidateId));
      } catch (error) {
        console.error("Failed to remove candidate:", error);
      }
    },
    [jobId]
  );

  // Take-home project handlers
  const handleGenerateTakeHome = useCallback(
    async (candidateId: string) => {
      setGeneratingTakeHome((prev) => new Set(prev).add(candidateId));
      try {
        const projects = await api.generateTakeHomeProjects(jobId, candidateId);
        setTakeHomeProjects((prev) => ({ ...prev, [candidateId]: projects }));
        setExpandedTakeHome((prev) => new Set(prev).add(candidateId));
      } catch (error) {
        console.error("Failed to generate take-home projects:", error);
      } finally {
        setGeneratingTakeHome((prev) => {
          const next = new Set(prev);
          next.delete(candidateId);
          return next;
        });
      }
    },
    [jobId]
  );

  const toggleTakeHomeExpand = useCallback((candidateId: string) => {
    setExpandedTakeHome((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  }, []);

  // Team handlers
  const handleSelectTeam = useCallback(
    async (team: Team | null) => {
      if (team) {
        await linkTeamToJob(jobId, team.id);
      } else {
        await unlinkTeamFromJob(jobId);
      }
    },
    [jobId, linkTeamToJob, unlinkTeamFromJob]
  );

  const handleUnlinkTeam = useCallback(async () => {
    await unlinkTeamFromJob(jobId);
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
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600">
                <Briefcase className="h-6 w-6 text-white" />
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
                    {job.requiredSkills.map((skill, index) => {
                      const skillName = getSkillName(skill);
                      return (
                        <span
                          key={`${skillName}-${index}`}
                          className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700"
                        >
                          {skillName}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
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
            onUpdateTeamMember={updateTeamMember}
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
        {candidatesLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <p className="mt-4 text-sm text-slate-500">Loading candidates...</p>
          </div>
        ) : jobCandidates.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-lg font-medium text-slate-600">
              No candidates yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Use AI Sourcing to find candidates for this role
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobCandidates.map((candidate) => {
              const isGenerating = generatingTakeHome.has(candidate.id);
              const projects = takeHomeProjects[candidate.id];
              const isExpanded = expandedTakeHome.has(candidate.id);

              return (
              <div key={candidate.id} className="relative rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="relative">
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

                {/* Take-Home Projects Section */}
                <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
                  {!projects || !projects.projects ? (
                    <button
                      onClick={() => handleGenerateTakeHome(candidate.id)}
                      disabled={isGenerating}
                      className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating Take-Home Project...
                        </>
                      ) : (
                        <>
                          <FileCode className="h-4 w-4" />
                          Generate Take-Home Project
                        </>
                      )}
                    </button>
                  ) : (
                    <div>
                      <button
                        onClick={() => toggleTakeHomeExpand(candidate.id)}
                        className="flex items-center gap-2 w-full text-left"
                      >
                        <FileCode className="h-4 w-4 text-violet-600" />
                        <span className="text-sm font-semibold text-slate-900">
                          Take-Home Projects
                        </span>
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                          {projects.projects.length} project{projects.projects.length !== 1 ? "s" : ""}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-400 ml-auto" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400 ml-auto" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-3">
                          {projects.analysis_summary?.identified_gaps?.length > 0 && (
                            <p className="text-xs text-slate-500 italic">
                              Skill gaps to assess: {projects.analysis_summary.identified_gaps.join(", ")}
                            </p>
                          )}
                          {projects.projects.map((project, idx) => (
                            <div
                              key={project.id || idx}
                              className="rounded-lg bg-white p-3 border border-slate-200"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-sm font-semibold text-slate-900">
                                  {project.title}
                                </h4>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                    project.difficulty === "easy"
                                      ? "bg-green-100 text-green-700"
                                      : project.difficulty === "medium"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-red-100 text-red-700"
                                  }`}>
                                    {project.difficulty}
                                  </span>
                                  <span className="flex items-center gap-1 text-xs text-slate-500">
                                    <Clock className="h-3 w-3" />
                                    {project.time_estimate_hours}h
                                  </span>
                                </div>
                              </div>
                              <p className="mt-1 text-xs text-slate-600">
                                {project.description}
                              </p>
                              {project.skill_gaps_addressed?.length > 0 && (
                                <p className="mt-2 text-xs text-violet-600 italic">
                                  Tests: {project.skill_gaps_addressed.join(", ")}
                                </p>
                              )}
                              {project.requirements?.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-slate-500 mb-1">Requirements:</p>
                                  <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5">
                                    {project.requirements.slice(0, 4).map((req, i) => (
                                      <li key={i}>{req}</li>
                                    ))}
                                    {project.requirements.length > 4 && (
                                      <li className="text-slate-400">+{project.requirements.length - 4} more</li>
                                    )}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )})}
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
    </div>
  );
}
