"use client";

import {
  X,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Github,
  Linkedin,
  Globe,
  FileText,
  Calendar,
} from "lucide-react";
import type { Candidate } from "../types";
import { ScoreRing } from "./ScoreRing";
import { ScoreBreakdown } from "./ScoreBreakdown";

interface CandidateDetailModalProps {
  candidate: Candidate | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToTeam?: (candidate: Candidate) => void;
  isInTeam?: boolean;
}

export function CandidateDetailModal({
  candidate,
  isOpen,
  onClose,
  onAddToTeam,
  isInTeam = false,
}: CandidateDetailModalProps) {
  if (!isOpen || !candidate) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xl font-bold text-white">
              {candidate.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{candidate.name}</h2>
              <p className="text-slate-600">{candidate.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {candidate.summary && (
                <div>
                  <h3 className="mb-2 font-semibold text-slate-900">Summary</h3>
                  <p className="text-slate-600">{candidate.summary}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                {candidate.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {candidate.location}
                  </span>
                )}
                {candidate.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-slate-400" />
                    {candidate.email}
                  </span>
                )}
                {candidate.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {candidate.phone}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                {candidate.links.github && (
                  <a
                    href={candidate.links.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                  >
                    <Github className="h-4 w-4" />
                    GitHub
                  </a>
                )}
                {candidate.links.linkedin && (
                  <a
                    href={candidate.links.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                  </a>
                )}
                {candidate.links.portfolio && (
                  <a
                    href={candidate.links.portfolio}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600"
                  >
                    <Globe className="h-4 w-4" />
                    Portfolio
                  </a>
                )}
              </div>

              <div>
                <h3 className="mb-3 font-semibold text-slate-900">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((skill) => (
                    <span
                      key={skill.name}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium ${getSkillLevelColor(
                        skill.level
                      )}`}
                    >
                      {skill.name}
                      {skill.yearsOfExperience && (
                        <span className="ml-1 text-xs opacity-75">
                          ({skill.yearsOfExperience}y)
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {candidate.experience.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
                    <Briefcase className="h-5 w-5 text-indigo-600" />
                    Experience
                  </h3>
                  <div className="space-y-4">
                    {candidate.experience.map((exp, index) => (
                      <div
                        key={index}
                        className="relative border-l-2 border-indigo-100 pl-4"
                      >
                        <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-indigo-600" />
                        <h4 className="font-medium text-slate-900">{exp.title}</h4>
                        <p className="text-sm text-slate-600">{exp.company}</p>
                        <p className="text-xs text-slate-500">{exp.duration}</p>
                        {exp.description && (
                          <p className="mt-1 text-sm text-slate-600">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {candidate.education.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
                    <GraduationCap className="h-5 w-5 text-violet-600" />
                    Education
                  </h3>
                  <div className="space-y-3">
                    {candidate.education.map((edu, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                      >
                        <h4 className="font-medium text-slate-900">{edu.degree}</h4>
                        <p className="text-sm text-slate-600">{edu.institution}</p>
                        {edu.field && (
                          <p className="text-xs text-slate-500">{edu.field}</p>
                        )}
                        <p className="text-xs text-slate-500">{edu.year}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
                <div className="flex flex-col items-center">
                  <ScoreRing
                    score={candidate.talentFitScore}
                    size="lg"
                    showLabel={false}
                  />
                  <p className="mt-2 text-sm font-medium text-slate-600">
                    TalentFit Score
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
                <h3 className="mb-3 font-semibold text-slate-900">Score Breakdown</h3>
                <ScoreBreakdown breakdown={candidate.scoreBreakdown} showChart={false} />
              </div>

              {candidate.resumeFileName && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700">
                        {candidate.resumeFileName}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="h-3 w-3" />
                        {new Date(candidate.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {onAddToTeam && (
                <button
                  onClick={() => onAddToTeam(candidate)}
                  disabled={isInTeam}
                  className={`
                    w-full rounded-xl py-3 text-center font-semibold transition-all btn-lift
                    ${isInTeam
                      ? "bg-emerald-100 text-emerald-700 cursor-default"
                      : "gradient-bg text-white shadow-button hover:shadow-lg"
                    }
                  `}
                >
                  {isInTeam ? "Already in Team" : "Add to Team"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
