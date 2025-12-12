"use client";

import { X, Pencil } from "lucide-react";
import type { TeamMember } from "../types";

interface TeamMemberCardProps {
  member: TeamMember;
  onRemove?: () => void;
  onEdit?: () => void;
  compact?: boolean;
}

const EXPERIENCE_LABELS: Record<string, string> = {
  entry: "Entry",
  mid: "Mid",
  senior: "Senior",
  lead: "Lead",
};

export function TeamMemberCard({
  member,
  onRemove,
  onEdit,
  compact = false,
}: TeamMemberCardProps) {
  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (compact) {
    return (
      <div className="group flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 py-1.5 pl-1.5 pr-2 transition-colors hover:bg-slate-100">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-400 to-violet-400 text-xs font-medium text-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium text-slate-700">
            {member.name.split(" ")[0]}
          </span>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="rounded p-0.5 text-slate-400 opacity-0 transition-opacity hover:bg-red-100 hover:text-red-600 group-hover:opacity-100"
            title="Remove from team"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="group rounded-xl border border-slate-100 bg-white p-4 transition-all hover:border-slate-200 hover:shadow-sm">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-400 text-sm font-semibold text-white">
          {initials}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-slate-900">{member.name}</h4>
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  title="Edit member"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {onRemove && (
                <button
                  onClick={onRemove}
                  className="rounded p-1 text-slate-400 hover:bg-red-100 hover:text-red-600"
                  title="Remove from team"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-slate-500">{member.role}</p>

          {/* Experience Level Badge */}
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {EXPERIENCE_LABELS[member.experienceLevel] || member.experienceLevel}
            </span>
          </div>

          {/* Skills */}
          {member.skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {member.skills.slice(0, 4).map((skill) => (
                <span
                  key={skill.name}
                  className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"
                >
                  {skill.name}
                </span>
              ))}
              {member.skills.length > 4 && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  +{member.skills.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
