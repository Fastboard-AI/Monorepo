"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Users, Trash2, TrendingUp, Sparkles } from "lucide-react";
import type { Candidate } from "../types";
import { CandidateCard } from "./CandidateCard";
import { ScoreRing } from "./ScoreRing";

interface TeamPanelProps {
  candidates: Candidate[];
  compatibilityScore: number;
  onRemoveCandidate: (candidateId: string) => void;
  targetRole?: string;
}

export function TeamPanel({
  candidates,
  compatibilityScore,
  onRemoveCandidate,
  targetRole,
}: TeamPanelProps) {
  const { setNodeRef, isOver } = useDroppable({ id: "team-panel" });

  const calculateTeamStats = () => {
    if (candidates.length === 0) return null;

    const avgScore =
      candidates.reduce((sum, c) => sum + c.talentFitScore, 0) / candidates.length;

    const allSkills = candidates.flatMap((c) => c.skills.map((s) => s.name));
    const uniqueSkills = [...new Set(allSkills)];

    return {
      avgScore: Math.round(avgScore),
      totalSkills: uniqueSkills.length,
      teamSize: candidates.length,
    };
  };

  const stats = calculateTeamStats();

  return (
    <div
      ref={setNodeRef}
      className={`
        rounded-2xl border-2 bg-white shadow-card transition-all duration-200
        ${isOver ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200"}
      `}
    >
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Your Team</h2>
              {targetRole && (
                <p className="text-xs text-slate-500">Building for: {targetRole}</p>
              )}
            </div>
          </div>
          <ScoreRing
            score={compatibilityScore}
            size="sm"
            label="Team Score"
          />
        </div>

        {stats && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-slate-50 p-2 text-center">
              <p className="text-lg font-bold text-slate-900">{stats.teamSize}</p>
              <p className="text-xs text-slate-500">Members</p>
            </div>
            <div className="rounded-lg bg-indigo-50 p-2 text-center">
              <p className="text-lg font-bold text-indigo-600">{stats.avgScore}</p>
              <p className="text-xs text-slate-500">Avg Score</p>
            </div>
            <div className="rounded-lg bg-violet-50 p-2 text-center">
              <p className="text-lg font-bold text-violet-600">{stats.totalSkills}</p>
              <p className="text-xs text-slate-500">Skills</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        {candidates.length === 0 ? (
          <div className={`
            flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center
            ${isOver ? "border-indigo-400 bg-indigo-50" : "border-slate-200"}
          `}>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <Sparkles className="h-6 w-6 text-slate-400" />
            </div>
            <p className="font-medium text-slate-600">Drag candidates here</p>
            <p className="mt-1 text-sm text-slate-400">
              Build your dream team by adding candidates
            </p>
          </div>
        ) : (
          <SortableContext
            items={candidates.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {candidates.map((candidate) => (
                <div key={candidate.id} className="group relative">
                  <CandidateCard
                    candidate={candidate}
                    isDraggable={true}
                    isCompact={true}
                  />
                  <button
                    onClick={() => onRemoveCandidate(candidate.id)}
                    className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-400 opacity-0 shadow-md transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </SortableContext>
        )}

        {candidates.length > 1 && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-700">
                  Team Synergy Detected
                </p>
                <p className="text-xs text-emerald-600">
                  {candidates.length} complementary skill sets found
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
