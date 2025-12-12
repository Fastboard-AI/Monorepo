"use client";

import { useState } from "react";
import {
  Users,
  Plus,
  UserPlus,
  Pencil,
  Unlink,
  Check,
  X,
} from "lucide-react";
import type { Team, Job, TeamMember } from "../types";
import { ScoreRing } from "./ScoreRing";
import { TeamMemberCard } from "./TeamMemberCard";

interface JobTeamPanelProps {
  job: Job;
  team: Team | null;
  onCreateTeam: () => void;
  onEditTeam: (updates: { name?: string; targetRole?: string }) => void;
  onUnlinkTeam: () => void;
  onAddMember: () => void;
  onRemoveMember: (memberId: string) => void;
}

export function JobTeamPanel({
  job,
  team,
  onCreateTeam,
  onEditTeam,
  onUnlinkTeam,
  onAddMember,
  onRemoveMember,
}: JobTeamPanelProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");

  // No team linked - show create button
  if (!team) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
            <Users className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="mt-3 font-semibold text-slate-900">No Team Created</h3>
          <p className="mt-1 text-sm text-slate-500">
            Create a team to organize candidates for this job
          </p>
          <button
            onClick={onCreateTeam}
            className="btn-lift mt-4 flex items-center gap-2 rounded-lg gradient-bg px-4 py-2 text-sm font-medium text-white shadow-button"
          >
            <Plus className="h-4 w-4" />
            Create Team for This Job
          </button>
        </div>
      </div>
    );
  }

  const handleSaveName = () => {
    if (editName.trim() && editName.trim() !== team.name) {
      onEditTeam({ name: editName.trim() });
    }
    setIsEditingName(false);
  };

  const handleSaveRole = () => {
    if (editRole.trim() !== (team.targetRole || "")) {
      onEditTeam({ targetRole: editRole.trim() || undefined });
    }
    setIsEditingRole(false);
  };

  const startEditingName = () => {
    setEditName(team.name);
    setIsEditingName(true);
  };

  const startEditingRole = () => {
    setEditRole(team.targetRole || "");
    setIsEditingRole(true);
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-sm">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            {/* Team Name */}
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="rounded-lg border border-indigo-300 px-2 py-1 text-lg font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                />
                <button
                  onClick={handleSaveName}
                  className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsEditingName(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="group flex items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-900">
                  {team.name}
                </h3>
                <button
                  onClick={startEditingName}
                  className="rounded p-1 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Target Role */}
            {isEditingRole ? (
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  placeholder="Target role..."
                  className="rounded-lg border border-indigo-300 px-2 py-0.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveRole();
                    if (e.key === "Escape") setIsEditingRole(false);
                  }}
                />
                <button
                  onClick={handleSaveRole}
                  className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setIsEditingRole(false)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="group mt-0.5 flex items-center gap-2">
                {team.targetRole ? (
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                    {team.targetRole}
                  </span>
                ) : (
                  <span className="text-sm text-slate-400">No target role</span>
                )}
                <button
                  onClick={startEditingRole}
                  className="rounded p-1 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Score */}
        <ScoreRing score={team.compatibilityScore} size="md" />
      </div>

      {/* Members */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">
            Team Members ({team.members.length})
          </span>
          <button
            onClick={onAddMember}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add Member
          </button>
        </div>

        {team.members.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">
            No team members yet. Add existing employees who will work with the new hire.
          </p>
        ) : (
          <div className="mt-3 grid gap-2">
            {team.members.map((member) => (
              <TeamMemberCard
                key={member.id}
                member={member}
                onRemove={() => onRemoveMember(member.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
        <button
          onClick={onUnlinkTeam}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <Unlink className="h-4 w-4" />
          Unlink Team
        </button>
      </div>
    </div>
  );
}
