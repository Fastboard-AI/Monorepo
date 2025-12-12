"use client";

import { useState } from "react";
import {
  X,
  Search,
  Linkedin,
  Github,
  Globe,
  Briefcase,
  MapPin,
  Code,
  Sparkles,
  Loader2,
} from "lucide-react";

interface SourceCandidatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartSourcing: (criteria: SourcingCriteria) => void;
}

export interface SourcingCriteria {
  jobTitle: string;
  skills: string[];
  location?: string;
  experienceLevel: "entry" | "mid" | "senior" | "lead" | "any";
  sources: ("linkedin" | "github" | "portfolio")[];
  companyPreferences?: string;
  keywords?: string;
}

const experienceLevels = [
  { value: "any", label: "Any Level" },
  { value: "entry", label: "Entry Level (0-2 years)" },
  { value: "mid", label: "Mid Level (2-5 years)" },
  { value: "senior", label: "Senior (5-8 years)" },
  { value: "lead", label: "Lead/Principal (8+ years)" },
];

export function SourceCandidatesModal({
  isOpen,
  onClose,
  onStartSourcing,
}: SourceCandidatesModalProps) {
  const [jobTitle, setJobTitle] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<
    "entry" | "mid" | "senior" | "lead" | "any"
  >("any");
  const [sources, setSources] = useState<("linkedin" | "github" | "portfolio")[]>([
    "linkedin",
    "github",
  ]);
  const [companyPreferences, setCompanyPreferences] = useState("");
  const [keywords, setKeywords] = useState("");
  const [isSourcing, setIsSourcing] = useState(false);

  if (!isOpen) return null;

  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && skillsInput.trim()) {
      e.preventDefault();
      if (!skills.includes(skillsInput.trim())) {
        setSkills([...skills, skillsInput.trim()]);
      }
      setSkillsInput("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const toggleSource = (source: "linkedin" | "github" | "portfolio") => {
    if (sources.includes(source)) {
      setSources(sources.filter((s) => s !== source));
    } else {
      setSources([...sources, source]);
    }
  };

  const handleStartSourcing = () => {
    if (!jobTitle.trim()) return;

    setIsSourcing(true);

    // Simulate sourcing delay for UI demo
    setTimeout(() => {
      onStartSourcing({
        jobTitle: jobTitle.trim(),
        skills,
        location: location.trim() || undefined,
        experienceLevel,
        sources,
        companyPreferences: companyPreferences.trim() || undefined,
        keywords: keywords.trim() || undefined,
      });
      setIsSourcing(false);
      handleClose();
    }, 2000);
  };

  const handleClose = () => {
    setJobTitle("");
    setSkillsInput("");
    setSkills([]);
    setLocation("");
    setExperienceLevel("any");
    setSources(["linkedin", "github"]);
    setCompanyPreferences("");
    setKeywords("");
    setIsSourcing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={!isSourcing ? handleClose : undefined}
      />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Source Candidates
              </h2>
              <p className="text-sm text-slate-500">
                Find talent from LinkedIn, GitHub & more
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSourcing}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          {/* Job Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Job Title <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g., Senior Full-Stack Developer"
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                disabled={isSourcing}
              />
            </div>
          </div>

          {/* Required Skills */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Required Skills
            </label>
            <div className="relative">
              <Code className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                onKeyDown={handleAddSkill}
                placeholder="Type a skill and press Enter..."
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                disabled={isSourcing}
              />
            </div>
            {skills.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700"
                  >
                    {skill}
                    <button
                      onClick={() => handleRemoveSkill(skill)}
                      className="ml-1 rounded-full p-0.5 hover:bg-indigo-100"
                      disabled={isSourcing}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Location{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., San Francisco Bay Area, Remote"
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                disabled={isSourcing}
              />
            </div>
          </div>

          {/* Experience Level */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Experience Level
            </label>
            <select
              value={experienceLevel}
              onChange={(e) =>
                setExperienceLevel(
                  e.target.value as "entry" | "mid" | "senior" | "lead" | "any"
                )
              }
              className="w-full rounded-lg border border-slate-200 py-2.5 px-4 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              disabled={isSourcing}
            >
              {experienceLevels.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sources */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Sources to Search
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => toggleSource("linkedin")}
                disabled={isSourcing}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                  sources.includes("linkedin")
                    ? "border-[#0A66C2] bg-[#0A66C2]/10 text-[#0A66C2]"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </button>
              <button
                type="button"
                onClick={() => toggleSource("github")}
                disabled={isSourcing}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                  sources.includes("github")
                    ? "border-slate-900 bg-slate-900/10 text-slate-900"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Github className="h-4 w-4" />
                GitHub
              </button>
              <button
                type="button"
                onClick={() => toggleSource("portfolio")}
                disabled={isSourcing}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                  sources.includes("portfolio")
                    ? "border-violet-600 bg-violet-50 text-violet-600"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Globe className="h-4 w-4" />
                Portfolios
              </button>
            </div>
          </div>

          {/* Company Preferences */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Company Preferences{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={companyPreferences}
              onChange={(e) => setCompanyPreferences(e.target.value)}
              placeholder="e.g., Ex-FAANG, YC startups, Fortune 500"
              className="w-full rounded-lg border border-slate-200 py-2.5 px-4 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              disabled={isSourcing}
            />
          </div>

          {/* Additional Keywords */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Additional Keywords{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g., startup experience, open source contributor"
              className="w-full rounded-lg border border-slate-200 py-2.5 px-4 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              disabled={isSourcing}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between border-t border-slate-100 bg-white p-6">
          <p className="text-sm text-slate-500">
            {sources.length === 0
              ? "Select at least one source"
              : `Searching ${sources.length} source${sources.length > 1 ? "s" : ""}`}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSourcing}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleStartSourcing}
              disabled={!jobTitle.trim() || sources.length === 0 || isSourcing}
              className="btn-lift flex items-center gap-2 rounded-lg gradient-bg px-5 py-2 text-sm font-medium text-white shadow-button disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSourcing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sourcing...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Start Sourcing
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
