"use client";

import { Users, Pencil, Trash2, Eye, UserPlus } from "lucide-react";
import type { Team } from "../types";
import { ScoreRing } from "./ScoreRing";

interface TeamCardProps {
  team: Team;
  onEdit: (team: Team) => void;
  onDelete: (team: Team) => void;
  onViewDetails: (team: Team) => void;
  onAddMember: (team: Team) => void;
}

export function TeamCard({
  team,
  onEdit,
  onDelete,
  onViewDetails,
  onAddMember,
}: TeamCardProps) {
  const uniqueSkills = new Set(
    team.members.flatMap((m) => m.skills.map((s) => s.name))
  ).size;

  // Count experience levels
  const seniorCount = team.members.filter(
    (m) => m.experienceLevel === "senior" || m.experienceLevel === "lead"
  ).length;

  return (
    <div className="group card-lift rounded-xl border border-slate-100 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{team.name}</h3>
            {team.targetRole && (
              <span className="mt-1 inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                {team.targetRole}
              </span>
            )}
          </div>
        </div>
        <ScoreRing score={team.compatibilityScore} size="sm" />
      </div>

      {/* Member avatars */}
      <div className="mt-4 flex items-center">
        <div className="flex -space-x-2">
          {team.members.slice(0, 4).map((member) => (
            <div
              key={member.id}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-indigo-400 to-violet-400 text-xs font-medium text-white"
              title={member.name}
            >
              {member.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
          ))}
          {team.members.length > 4 && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-xs font-medium text-slate-600">
              +{team.members.length - 4}
            </div>
          )}
        </div>
        {team.members.length === 0 && (
          <span className="text-sm text-slate-400">No members yet</span>
        )}
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3">
        <div className="text-center">
          <p className="text-lg font-bold text-slate-900">
            {team.members.length}
          </p>
          <p className="text-xs text-slate-500">Members</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-indigo-600">{uniqueSkills}</p>
          <p className="text-xs text-slate-500">Skills</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-violet-600">{seniorCount}</p>
          <p className="text-xs text-slate-500">Senior+</p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
        <button
          onClick={() => onViewDetails(team)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
        >
          <Eye className="h-4 w-4" />
          View
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAddMember(team)}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
            title="Add member"
          >
            <UserPlus className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEdit(team)}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="Edit team"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(team)}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
            title="Delete team"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
