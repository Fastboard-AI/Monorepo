"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Plus, Users, ChevronRight } from "lucide-react";
import { useJobs } from "../hooks/useJobs";
import { CreateJobModal } from "./CreateJobModal";
import type { Job } from "../types";

const statusColors: Record<Job["status"], string> = {
  sourcing: "bg-indigo-100 text-indigo-700",
  reviewing: "bg-amber-100 text-amber-700",
  filled: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-100 text-slate-500",
};

export function JobsNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { jobs, isLoading, createJob } = useJobs();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Extract jobId from pathname if on a job detail page
  const activeJobId = pathname.startsWith("/dashboard/jobs/")
    ? pathname.split("/")[3]
    : null;

  const handleJobClick = (jobId: string) => {
    router.push(`/dashboard/jobs/${jobId}`);
  };

  const handleCreateJob = async (data: {
    title: string;
    description?: string;
    location?: string;
    requiredSkills?: string[];
    experienceLevel?: Job["experienceLevel"];
  }) => {
    const newJob = await createJob(data);
    router.push(`/dashboard/jobs/${newJob.id}`);
  };

  if (isLoading) {
    return (
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-12 items-center gap-2">
            <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-200" />
            <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-12 items-center gap-2 overflow-x-auto scrollbar-hide">
            {/* Job tabs */}
            {jobs.length === 0 ? (
              <span className="text-sm text-slate-400">No jobs yet</span>
            ) : (
              <div className="flex items-center gap-1.5">
                {jobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => handleJobClick(job.id)}
                    className={`group flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                      activeJobId === job.id
                        ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm"
                        : "bg-white text-slate-700 shadow-sm hover:bg-slate-100"
                    }`}
                  >
                    <span className="max-w-[120px] truncate">{job.title}</span>
                    <span
                      className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs ${
                        activeJobId === job.id
                          ? "bg-white/20 text-white"
                          : statusColors[job.status]
                      }`}
                    >
                      <Users className="h-3 w-3" />
                      {job.candidateIds.length}
                    </span>
                    {activeJobId === job.id && (
                      <ChevronRight className="h-3.5 w-3.5 opacity-70" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Create Job button */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Job</span>
            </button>
          </div>
        </div>
      </div>

      {/* Create Job Modal */}
      <CreateJobModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateJob={handleCreateJob}
      />
    </>
  );
}
