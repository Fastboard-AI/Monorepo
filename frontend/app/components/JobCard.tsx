"use client";

import {
  Briefcase,
  MapPin,
  Users,
  Clock,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";
import type { Job } from "../types";

interface JobCardProps {
  job: Job;
  onEdit: (job: Job) => void;
  onDelete: (job: Job) => void;
  onViewDetails: (job: Job) => void;
}

const statusConfig: Record<
  Job["status"],
  { label: string; className: string }
> = {
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

export function JobCard({
  job,
  onEdit,
  onDelete,
  onViewDetails,
}: JobCardProps) {
  const status = statusConfig[job.status];
  const createdDate = new Date(job.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="card-lift group rounded-xl border border-slate-100 bg-white p-5 shadow-card transition-all hover:shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm">
            <Briefcase className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">
              {job.title}
            </h3>
            <div className="mt-0.5 flex items-center gap-2 text-sm text-slate-500">
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {job.location}
                </span>
              )}
              {!job.location && (
                <span className="text-slate-400">No location set</span>
              )}
            </div>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      {/* Description */}
      {job.description && (
        <p className="mt-3 text-sm text-slate-600 line-clamp-2">
          {job.description}
        </p>
      )}

      {/* Skills */}
      {job.requiredSkills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.requiredSkills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
            >
              {skill}
            </span>
          ))}
          {job.requiredSkills.length > 4 && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
              +{job.requiredSkills.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-4 text-sm">
        <div className="flex items-center gap-1.5 text-slate-600">
          <Users className="h-4 w-4 text-indigo-500" />
          <span className="font-medium">{job.candidateIds.length}</span>
          <span className="text-slate-400">candidates</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <Clock className="h-3.5 w-3.5" />
          <span>{createdDate}</span>
        </div>
        <span className="text-xs text-slate-400">
          {experienceLabels[job.experienceLevel]}
        </span>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => onViewDetails(job)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
        >
          <Eye className="h-4 w-4" />
          View
        </button>
        <button
          onClick={() => onEdit(job)}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          title="Edit job"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(job)}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
          title="Delete job"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
