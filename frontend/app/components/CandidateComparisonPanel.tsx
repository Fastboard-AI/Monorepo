"use client";

import { X, Briefcase, GraduationCap } from "lucide-react";
import type { Candidate } from "../types";
import { ScoreRing } from "./ScoreRing";

interface CandidateComparisonPanelProps {
  candidates: Candidate[];
  isOpen: boolean;
  onClose: () => void;
  onRemoveCandidate: (id: string) => void;
}

export function CandidateComparisonPanel({
  candidates,
  isOpen,
  onClose,
  onRemoveCandidate,
}: CandidateComparisonPanelProps) {
  if (!isOpen || candidates.length === 0) return null;

  // Find common skills across all candidates
  const getCommonSkills = () => {
    if (candidates.length < 2) return new Set<string>();
    const allSkillSets = candidates.map(
      (c) => new Set(c.skills.map((s) => s.name))
    );
    const firstSet = allSkillSets[0];
    const common = new Set<string>();
    firstSet.forEach((skill) => {
      if (allSkillSets.every((set) => set.has(skill))) {
        common.add(skill);
      }
    });
    return common;
  };

  const commonSkills = getCommonSkills();

  const getSkillLevelColor = (level: string, isCommon: boolean) => {
    if (isCommon) {
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    }
    switch (level) {
      case "expert":
        return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "advanced":
        return "bg-violet-100 text-violet-700 border-violet-200";
      case "intermediate":
        return "bg-amber-100 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`relative flex w-full flex-col bg-white shadow-2xl ${
          candidates.length === 3 ? "max-w-5xl" : "max-w-3xl"
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white p-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Compare <span className="gradient-text">Candidates</span>
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} selected
              {commonSkills.size > 0 && (
                <span className="ml-2 text-emerald-600">
                  ({commonSkills.size} common skill{commonSkills.size !== 1 ? "s" : ""})
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Comparison Grid */}
        <div className="flex-1 overflow-y-auto">
          <div
            className={`grid divide-x divide-slate-100 ${
              candidates.length === 3
                ? "grid-cols-3"
                : candidates.length === 2
                ? "grid-cols-2"
                : "grid-cols-1"
            }`}
          >
            {candidates.map((candidate) => (
              <div key={candidate.id} className="p-6 space-y-6">
                {/* Candidate Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-lg font-bold text-white">
                      {candidate.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {candidate.name}
                      </h3>
                      <p className="text-sm text-slate-600">{candidate.title}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveCandidate(candidate.id)}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Overall Score */}
                <div className="flex justify-center py-4">
                  <ScoreRing score={candidate.talentFitScore} size="lg" />
                </div>

                {/* Score Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-900">
                    Score Breakdown
                  </h4>
                  <div className="space-y-2">
                    <ScoreBar
                      label="Skills Match"
                      value={candidate.scoreBreakdown.skillsMatch}
                    />
                    <ScoreBar
                      label="Experience"
                      value={candidate.scoreBreakdown.experienceMatch}
                    />
                    <ScoreBar
                      label="Work Style"
                      value={candidate.scoreBreakdown.workStyleAlignment}
                    />
                    <ScoreBar
                      label="Team Fit"
                      value={candidate.scoreBreakdown.teamFit}
                    />
                  </div>
                </div>

                {/* Skills */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-900">Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.map((skill) => {
                      const isCommon = commonSkills.has(skill.name);
                      return (
                        <span
                          key={skill.name}
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getSkillLevelColor(
                            skill.level,
                            isCommon
                          )}`}
                          title={isCommon ? "Common skill" : skill.level}
                        >
                          {skill.name}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Experience */}
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Briefcase className="h-4 w-4 text-indigo-600" />
                    Experience
                  </h4>
                  <div className="space-y-2">
                    {candidate.experience.slice(0, 2).map((exp, i) => (
                      <div key={i} className="text-sm">
                        <p className="font-medium text-slate-700">{exp.title}</p>
                        <p className="text-slate-500">
                          {exp.company} &middot; {exp.duration}
                        </p>
                      </div>
                    ))}
                    {candidate.experience.length > 2 && (
                      <p className="text-xs text-slate-400">
                        +{candidate.experience.length - 2} more roles
                      </p>
                    )}
                  </div>
                </div>

                {/* Education */}
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <GraduationCap className="h-4 w-4 text-violet-600" />
                    Education
                  </h4>
                  <div className="space-y-2">
                    {candidate.education.map((edu, i) => (
                      <div key={i} className="text-sm">
                        <p className="font-medium text-slate-700">{edu.degree}</p>
                        <p className="text-slate-500">{edu.institution}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-900">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
