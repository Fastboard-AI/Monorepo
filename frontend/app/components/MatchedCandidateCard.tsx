"use client";

import { Eye, UserPlus, Briefcase, Users } from "lucide-react";
import type { Candidate } from "../types";

interface MatchedCandidateCardProps {
  candidate: Candidate;
  jobMatchScore: number;
  teamCompatibilityScore: number;
  onViewDetails?: () => void;
  onAddToJob?: () => void;
}

function ScoreBadge({
  score,
  label,
  icon: Icon,
  colorClass,
}: {
  score: number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`h-3.5 w-3.5 ${colorClass}`} />
      <span className="text-xs text-slate-500">{label}:</span>
      <span className={`text-sm font-semibold ${colorClass}`}>{score}%</span>
    </div>
  );
}

export function MatchedCandidateCard({
  candidate,
  jobMatchScore,
  teamCompatibilityScore,
  onViewDetails,
  onAddToJob,
}: MatchedCandidateCardProps) {
  const overallScore = Math.round((jobMatchScore + teamCompatibilityScore) / 2);

  const initials = candidate.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Color coding for overall score
  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 70) return "text-indigo-600 bg-indigo-50 border-indigo-200";
    if (score >= 50) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-slate-600 bg-slate-50 border-slate-200";
  };

  const scoreColorClass = getScoreColor(overallScore);

  return (
    <div className="group rounded-xl border border-slate-100 bg-white p-4 transition-all hover:border-slate-200 hover:shadow-md">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        {candidate.avatarUrl ? (
          <img
            src={candidate.avatarUrl}
            alt={candidate.name}
            className="h-12 w-12 flex-shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-400 text-sm font-semibold text-white">
            {initials}
          </div>
        )}

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-slate-900">{candidate.name}</h4>
              <p className="text-sm text-slate-500">{candidate.title}</p>
            </div>

            {/* Overall Score Badge */}
            <div
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 ${scoreColorClass}`}
            >
              <span className="text-xs font-medium">Overall</span>
              <span className="text-lg font-bold">{overallScore}%</span>
            </div>
          </div>

          {/* Detailed Scores */}
          <div className="mt-3 flex items-center gap-4">
            <ScoreBadge
              score={jobMatchScore}
              label="Job"
              icon={Briefcase}
              colorClass="text-indigo-600"
            />
            <ScoreBadge
              score={teamCompatibilityScore}
              label="Team"
              icon={Users}
              colorClass="text-violet-600"
            />
          </div>

          {/* Skills */}
          {candidate.skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {candidate.skills.slice(0, 5).map((skill) => (
                <span
                  key={skill.name}
                  className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
                >
                  {skill.name}
                </span>
              ))}
              {candidate.skills.length > 5 && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-400">
                  +{candidate.skills.length - 5}
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex items-center gap-2">
            {onViewDetails && (
              <button
                onClick={onViewDetails}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <Eye className="h-4 w-4" />
                View Details
              </button>
            )}
            {onAddToJob && (
              <button
                onClick={onAddToJob}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-1.5 text-sm font-medium text-white transition-all hover:from-indigo-600 hover:to-violet-600"
              >
                <UserPlus className="h-4 w-4" />
                Add to Job
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
