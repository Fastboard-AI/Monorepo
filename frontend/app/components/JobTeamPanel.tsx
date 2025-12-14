"use client";

import { useState } from "react";
import { Users, Unlink, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Team, Job, TeamMember } from "../types";
import { ScoreRing } from "./ScoreRing";
import { TeamMemberCard } from "./TeamMemberCard";
import { TeamSelector } from "./TeamSelector";
import { EditTeamMemberModal } from "./EditTeamMemberModal";
import { TeamMemberDetailModal } from "./TeamMemberDetailModal";

interface JobTeamPanelProps {
  job: Job;
  team: Team | null;
  teams: Team[];
  isLoadingTeams?: boolean;
  onSelectTeam: (team: Team | null) => void;
  onUnlinkTeam: () => void;
  onUpdateTeamMember?: (teamId: string, memberId: string, updates: Partial<Omit<TeamMember, "id">>) => Promise<TeamMember>;
}

export function JobTeamPanel({
  job,
  team,
  teams,
  isLoadingTeams = false,
  onSelectTeam,
  onUnlinkTeam,
  onUpdateTeamMember,
}: JobTeamPanelProps) {
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [viewingMember, setViewingMember] = useState<TeamMember | null>(null);

  const handleUpdateMember = async (memberId: string, updates: Partial<Omit<TeamMember, "id">>) => {
    if (!team || !onUpdateTeamMember) return;
    await onUpdateTeamMember(team.id, memberId, updates);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Team</h3>
            <p className="text-sm text-slate-500">
              Select a team for compatibility matching
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/teams"
          className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          Manage Teams
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Team Selector */}
      <TeamSelector
        teams={teams}
        selectedTeamId={team?.id || null}
        onSelect={onSelectTeam}
        isLoading={isLoadingTeams}
      />

      {/* Show linked team details */}
      {team && (
        <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-slate-900">{team.name}</h4>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                <span>
                  {team.members.length} member
                  {team.members.length !== 1 ? "s" : ""}
                </span>
                {team.targetRole && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>{team.targetRole}</span>
                  </>
                )}
              </div>
            </div>
            <ScoreRing score={team.compatibilityScore} size="sm" />
          </div>

          {/* Members */}
          {team.members.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-slate-500">
                Team Members
              </p>
              <div className="space-y-2">
                {team.members.map((member) => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    onClick={() => setViewingMember(member)}
                    onEdit={onUpdateTeamMember ? () => setEditingMember(member) : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Unlink button */}
          <div className="mt-4 flex justify-end border-t border-slate-200 pt-3">
            <button
              onClick={onUnlinkTeam}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-white hover:text-slate-700"
            >
              <Unlink className="h-4 w-4" />
              Unlink Team
            </button>
          </div>
        </div>
      )}

      {/* Team Member Detail Modal */}
      <TeamMemberDetailModal
        member={viewingMember}
        isOpen={viewingMember !== null}
        onClose={() => setViewingMember(null)}
        onEdit={onUpdateTeamMember ? () => {
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
