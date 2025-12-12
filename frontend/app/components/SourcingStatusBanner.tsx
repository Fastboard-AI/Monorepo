"use client";

import { Sparkles, Loader2, CheckCircle2, X, Users } from "lucide-react";
import type { SourcingCriteria } from "./SourceCandidatesModal";

export type SourcingStatus = "idle" | "sourcing" | "completed";

interface SourcingStatusBannerProps {
  status: SourcingStatus;
  criteria: SourcingCriteria | null;
  candidatesFound?: number;
  onDismiss: () => void;
}

export function SourcingStatusBanner({
  status,
  criteria,
  candidatesFound = 0,
  onDismiss,
}: SourcingStatusBannerProps) {
  if (status === "idle" || !criteria) return null;

  return (
    <div
      className={`rounded-xl border p-4 ${
        status === "sourcing"
          ? "border-indigo-200 bg-indigo-50"
          : "border-emerald-200 bg-emerald-50"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              status === "sourcing"
                ? "bg-indigo-100"
                : "bg-emerald-100"
            }`}
          >
            {status === "sourcing" ? (
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p
                className={`font-medium ${
                  status === "sourcing" ? "text-indigo-900" : "text-emerald-900"
                }`}
              >
                {status === "sourcing"
                  ? "Sourcing candidates..."
                  : "Sourcing complete!"}
              </p>
              {status === "completed" && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  <Users className="h-3 w-3" />
                  {candidatesFound} found
                </span>
              )}
            </div>
            <p
              className={`text-sm ${
                status === "sourcing" ? "text-indigo-600" : "text-emerald-600"
              }`}
            >
              {criteria.jobTitle}
              {criteria.skills.length > 0 && (
                <> · {criteria.skills.slice(0, 3).join(", ")}</>
              )}
              {criteria.location && <> · {criteria.location}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === "sourcing" && (
            <div className="flex items-center gap-1.5 text-sm text-indigo-600">
              <Sparkles className="h-4 w-4" />
              Scanning {criteria.sources.join(", ")}
            </div>
          )}
          {status === "completed" && (
            <button
              onClick={onDismiss}
              className="rounded-lg p-1.5 text-emerald-600 transition-colors hover:bg-emerald-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
