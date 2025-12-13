"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Briefcase, MapPin, Check } from "lucide-react";
import type { Job } from "../types";

interface JobSelectorProps {
  jobs: Job[];
  selectedJobId: string | null;
  onSelect: (job: Job | null) => void;
  isLoading?: boolean;
}

const EXPERIENCE_LABELS: Record<string, string> = {
  entry: "Entry Level",
  mid: "Mid Level",
  senior: "Senior",
  lead: "Lead",
  any: "Any Level",
};

export function JobSelector({
  jobs,
  selectedJobId,
  onSelect,
  isLoading = false,
}: JobSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedJob = jobs.find((job) => job.id === selectedJobId) || null;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-left transition-all ${
          isOpen
            ? "border-indigo-300 ring-2 ring-indigo-100"
            : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              selectedJob
                ? "bg-gradient-to-br from-indigo-500 to-violet-500"
                : "bg-slate-100"
            }`}
          >
            <Briefcase
              className={`h-5 w-5 ${
                selectedJob ? "text-white" : "text-slate-400"
              }`}
            />
          </div>
          <div>
            {selectedJob ? (
              <>
                <div className="font-medium text-slate-900">
                  {selectedJob.title}
                </div>
                <div className="text-sm text-slate-500">
                  {EXPERIENCE_LABELS[selectedJob.experienceLevel]}
                  {selectedJob.location && ` • ${selectedJob.location}`}
                </div>
              </>
            ) : (
              <>
                <div className="font-medium text-slate-500">Select a job</div>
                <div className="text-sm text-slate-400">
                  Choose the position you're hiring for
                </div>
              </>
            )}
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-80 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {jobs.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-500">
              <Briefcase className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="font-medium">No jobs yet</p>
              <p className="mt-1 text-sm">
                Create a job first to start matching
              </p>
            </div>
          ) : (
            <div className="py-1">
              {jobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => {
                    onSelect(job);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                    selectedJobId === job.id
                      ? "bg-indigo-50"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                      selectedJobId === job.id
                        ? "bg-gradient-to-br from-indigo-500 to-violet-500"
                        : "bg-slate-100"
                    }`}
                  >
                    {selectedJobId === job.id ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : (
                      <Briefcase className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`font-medium ${
                        selectedJobId === job.id
                          ? "text-indigo-700"
                          : "text-slate-900"
                      }`}
                    >
                      {job.title}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span>{EXPERIENCE_LABELS[job.experienceLevel]}</span>
                      {job.location && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {job.location}
                          </span>
                        </>
                      )}
                    </div>
                    {job.requiredSkills.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {job.requiredSkills.slice(0, 3).map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                          >
                            {skill}
                          </span>
                        ))}
                        {job.requiredSkills.length > 3 && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                            +{job.requiredSkills.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
