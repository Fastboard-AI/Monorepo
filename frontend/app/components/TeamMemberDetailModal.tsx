"use client";

import { X, Pencil, Github, Linkedin, Globe, Briefcase, GraduationCap } from "lucide-react";
import type { TeamMember } from "../types";
import { CodeCharacteristicsRadar } from "./CodeCharacteristicsRadar";

interface TeamMemberDetailModalProps {
  member: TeamMember | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
}

const EXPERIENCE_LABELS: Record<string, string> = {
  entry: "Entry Level",
  mid: "Mid Level",
  senior: "Senior",
  lead: "Lead / Principal",
};

const WORK_STYLE_LABELS = {
  communication: {
    async: "Async (email, messages)",
    sync: "Sync (calls, meetings)",
    mixed: "Mixed (flexible)",
  },
  collaboration: {
    independent: "Independent",
    collaborative: "Collaborative",
    balanced: "Balanced",
  },
  pace: {
    fast: "Fast-paced",
    steady: "Steady",
    flexible: "Flexible",
  },
};

export function TeamMemberDetailModal({
  member,
  isOpen,
  onClose,
  onEdit,
}: TeamMemberDetailModalProps) {
  if (!isOpen || !member) return null;

  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-400 text-lg font-semibold text-white">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{member.name}</h2>
              <p className="text-slate-500">{member.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => { onClose(); onEdit(); }}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Experience & Links */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              <Briefcase className="h-3.5 w-3.5" />
              {EXPERIENCE_LABELS[member.experienceLevel] || member.experienceLevel}
            </span>
            {member.github && (
              <a
                href={`https://github.com/${member.github}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-sm font-medium text-white hover:bg-slate-700"
              >
                <Github className="h-3.5 w-3.5" />
                {member.github}
              </a>
            )}
            {member.linkedin && (
              <a
                href={member.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Linkedin className="h-3.5 w-3.5" />
                LinkedIn
              </a>
            )}
            {member.website && (
              <a
                href={member.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <Globe className="h-3.5 w-3.5" />
                Website
              </a>
            )}
          </div>

          {/* Skills */}
          {member.skills.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-700">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {member.skills.map((skill) => (
                  <span
                    key={skill.name}
                    className="rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-700"
                  >
                    {skill.name}
                    <span className="ml-1 text-indigo-400">({skill.level})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Work Style */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-3 text-sm font-medium text-slate-700">Work Style</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">Communication</p>
                <p className="text-sm font-medium text-slate-900">
                  {WORK_STYLE_LABELS.communication[member.workStyle.communication] || member.workStyle.communication}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Collaboration</p>
                <p className="text-sm font-medium text-slate-900">
                  {WORK_STYLE_LABELS.collaboration[member.workStyle.collaboration] || member.workStyle.collaboration}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Pace</p>
                <p className="text-sm font-medium text-slate-900">
                  {WORK_STYLE_LABELS.pace[member.workStyle.pace] || member.workStyle.pace}
                </p>
              </div>
            </div>
          </div>

          {/* Code Characteristics Radar Chart */}
          {member.codeCharacteristics ? (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
              <h3 className="mb-2 text-sm font-medium text-slate-700">Code Style Analysis</h3>
              <p className="mb-4 text-xs text-slate-500">
                Based on analysis of public GitHub repositories
              </p>
              <CodeCharacteristicsRadar characteristics={member.codeCharacteristics} />
            </div>
          ) : member.github ? (
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <h3 className="text-sm font-medium text-amber-800">Code Analysis Pending</h3>
              <p className="mt-1 text-xs text-amber-600">
                Code style analysis is running in the background. Refresh to see results.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
