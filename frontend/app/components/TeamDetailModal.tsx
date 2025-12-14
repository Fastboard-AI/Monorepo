"use client";

import { useState } from "react";
import { X, Users, UserPlus, TrendingUp } from "lucide-react";
import type { Team, TeamMember } from "../types";
import { ScoreRing } from "./ScoreRing";
import { TeamMemberCard } from "./TeamMemberCard";
import { TeamMemberDetailModal } from "./TeamMemberDetailModal";
import { EditTeamMemberModal } from "./EditTeamMemberModal";

interface TeamDetailModalProps {
  team: Team | null;
  isOpen: boolean;
  onClose: () => void;
  onRemoveMember: (teamId: string, memberId: string) => void;
  onAddMember: (team: Team) => void;
  onUpdateMember?: (teamId: string, memberId: string, updates: Partial<Omit<TeamMember, "id">>) => Promise<TeamMember>;
}

export function TeamDetailModal({
  team,
  isOpen,
  onClose,
  onRemoveMember,
  onAddMember,
  onUpdateMember,
}: TeamDetailModalProps) {
  const [viewingMember, setViewingMember] = useState<TeamMember | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  if (!isOpen || !team) return null;

  const handleUpdateMember = async (memberId: string, updates: Partial<Omit<TeamMember, "id">>) => {
    if (!onUpdateMember) return;
    await onUpdateMember(team.id, memberId, updates);
  };

  const uniqueSkills = new Set(
    team.members.flatMap((m) => m.skills.map((s) => s.name))
  );

  // Count senior+ members
  const seniorCount = team.members.filter(
    (m) => m.experienceLevel === "senior" || m.experienceLevel === "lead"
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{team.name}</h2>
              {team.targetRole && (
                <span className="mt-1 inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                  {team.targetRole}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ScoreRing score={team.compatibilityScore} size="sm" />
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Stats */}
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">
                {team.members.length}
              </p>
              <p className="text-sm text-slate-500">Members</p>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">{seniorCount}</p>
              <p className="text-sm text-slate-500">Senior+</p>
            </div>
            <div className="rounded-xl border border-violet-100 bg-violet-50 p-4 text-center">
              <p className="text-2xl font-bold text-violet-600">
                {uniqueSkills.size}
              </p>
              <p className="text-sm text-slate-500">Unique Skills</p>
            </div>
          </div>

          {/* Synergy indicator */}
          {team.members.length > 1 && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-medium text-emerald-700">
                    Team Synergy Active
                  </p>
                  <p className="text-sm text-emerald-600">
                    {team.members.length} team members with complementary skills
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Members */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Team Members</h3>
            <button
              onClick={() => onAddMember(team)}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
            >
              <UserPlus className="h-4 w-4" />
              Add Member
            </button>
          </div>

          {team.members.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
              <Users className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-2 font-medium text-slate-600">No members yet</p>
              <p className="text-sm text-slate-400">
                Add existing employees to define your team
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {team.members.map((member) => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
                  onClick={() => setViewingMember(member)}
                  onEdit={onUpdateMember ? () => setEditingMember(member) : undefined}
                  onRemove={() => onRemoveMember(team.id, member.id)}
                />
              ))}
            </div>
          )}

          {/* Skills overview */}
          {uniqueSkills.size > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 font-semibold text-slate-900">
                Team Skills Coverage
              </h3>
              <div className="flex flex-wrap gap-2">
                {Array.from(uniqueSkills).map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Team Member Detail Modal */}
      <TeamMemberDetailModal
        member={viewingMember}
        isOpen={viewingMember !== null}
        onClose={() => setViewingMember(null)}
        onEdit={onUpdateMember ? () => {
          setViewingMember(null);
          setEditingMember(viewingMember);
        } : undefined}
      />

      {/* Edit Team Member Modal */}
      <EditTeamMemberModal
        team={team}
        member={editingMember}
        isOpen={editingMember !== null}
        onClose={() => setEditingMember(null)}
        onUpdateMember={handleUpdateMember}
      />
    </div>
  );
}
