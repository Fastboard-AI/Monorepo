"use client";

import { useState } from "react";
import {
  MapPin,
  Briefcase,
  Github,
  Linkedin,
  Globe,
  ChevronDown,
  ChevronUp,
  GitCompare,
  Check,
} from "lucide-react";
import type { Candidate } from "../types";
import { ScoreRing } from "./ScoreRing";

interface SelectableCandidateCardProps {
  candidate: Candidate;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onCompare: (candidate: Candidate) => void;
  onClick: () => void;
  isInComparison?: boolean;
  comparisonDisabled?: boolean;
}

export function SelectableCandidateCard({
  candidate,
  isSelected,
  onToggleSelect,
  onCompare,
  onClick,
  isInComparison = false,
  comparisonDisabled = false,
}: SelectableCandidateCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case "expert":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "advanced":
        return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "intermediate":
        return "bg-violet-100 text-violet-700 border-violet-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect(candidate.id);
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCompare(candidate);
  };

  return (
    <div
      className={`
        group relative card-lift rounded-xl border bg-white shadow-card cursor-pointer
        ${isSelected ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-slate-100"}
      `}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          <div
            className="mt-1 flex items-center"
            onClick={handleCheckboxClick}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              className="h-5 w-5 rounded border-slate-300 text-indigo-600 cursor-pointer
                         focus:ring-2 focus:ring-indigo-500/20 focus:ring-offset-0"
            />
          </div>

          {/* Avatar */}
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-lg font-bold text-white">
            {candidate.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-900 truncate">
                  {candidate.name}
                </h3>
                <p className="text-sm text-slate-600">{candidate.title}</p>
              </div>
              <ScoreRing score={candidate.talentFitScore} size="sm" />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {candidate.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {candidate.location}
                </span>
              )}
              {candidate.experience.length > 0 && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  {candidate.experience.length} roles
                </span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {candidate.skills.slice(0, isExpanded ? undefined : 4).map((skill) => (
                <span
                  key={skill.name}
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getSkillLevelColor(
                    skill.level
                  )}`}
                >
                  {skill.name}
                </span>
              ))}
              {!isExpanded && candidate.skills.length > 4 && (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  +{candidate.skills.length - 4}
                </span>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2">
              {candidate.links.github && (
                <a
                  href={candidate.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <Github className="h-4 w-4" />
                </a>
              )}
              {candidate.links.linkedin && (
                <a
                  href={candidate.links.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
              {candidate.links.portfolio && (
                <a
                  href={candidate.links.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-violet-600"
                >
                  <Globe className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Compare Button */}
          <button
            onClick={handleCompareClick}
            disabled={comparisonDisabled && !isInComparison}
            className={`
              rounded-lg border px-3 py-1.5 text-sm font-medium transition-all
              opacity-0 group-hover:opacity-100
              ${isInComparison
                ? "border-violet-500 bg-violet-50 text-violet-700"
                : comparisonDisabled
                ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                : "border-slate-200 text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600"
              }
            `}
          >
            {isInComparison ? (
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" />
                Comparing
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <GitCompare className="h-3.5 w-3.5" />
                Compare
              </span>
            )}
          </button>
        </div>

        {candidate.skills.length > 4 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
          >
            {isExpanded ? (
              <>
                Show less <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                Show all skills <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
