"use client";

import { useState } from "react";
import { X, Briefcase, MapPin, Code } from "lucide-react";
import type { ExperienceLevel } from "../types";

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateJob: (data: {
    title: string;
    description?: string;
    location?: string;
    requiredSkills?: string[];
    experienceLevel?: ExperienceLevel;
  }) => void;
}

const experienceLevels: { value: ExperienceLevel; label: string }[] = [
  { value: "any", label: "Any Level" },
  { value: "entry", label: "Entry Level (0-2 years)" },
  { value: "mid", label: "Mid Level (2-5 years)" },
  { value: "senior", label: "Senior (5-8 years)" },
  { value: "lead", label: "Lead/Principal (8+ years)" },
];

export function CreateJobModal({
  isOpen,
  onClose,
  onCreateJob,
}: CreateJobModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("any");

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onCreateJob({
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      requiredSkills: skills.length > 0 ? skills : undefined,
      experienceLevel,
    });

    handleClose();
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setLocation("");
    setSkillsInput("");
    setSkills([]);
    setExperienceLevel("any");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Create New Job
              </h2>
              <p className="text-sm text-slate-500">
                Define the role you're hiring for
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Job Title */}
          <div>
            <label
              htmlFor="job-title"
              className="block text-sm font-medium text-slate-700"
            >
              Job Title <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1.5">
              <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="job-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Senior Full-Stack Developer"
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                autoFocus
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="job-description"
              className="block text-sm font-medium text-slate-700"
            >
              Description{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="job-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the role and responsibilities..."
              rows={3}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Location */}
          <div>
            <label
              htmlFor="job-location"
              className="block text-sm font-medium text-slate-700"
            >
              Location{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <div className="relative mt-1.5">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="job-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., San Francisco, CA or Remote"
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Required Skills */}
          <div>
            <label
              htmlFor="job-skills"
              className="block text-sm font-medium text-slate-700"
            >
              Required Skills{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <div className="relative mt-1.5">
              <Code className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="job-skills"
                type="text"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                onKeyDown={handleAddSkill}
                placeholder="Type a skill and press Enter..."
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="ml-1 rounded-full p-0.5 hover:bg-indigo-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Experience Level */}
          <div>
            <label
              htmlFor="experience-level"
              className="block text-sm font-medium text-slate-700"
            >
              Experience Level
            </label>
            <select
              id="experience-level"
              value={experienceLevel}
              onChange={(e) =>
                setExperienceLevel(e.target.value as ExperienceLevel)
              }
              className="mt-1.5 w-full rounded-lg border border-slate-200 py-2.5 px-4 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {experienceLevels.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="btn-lift rounded-lg gradient-bg px-4 py-2 text-sm font-medium text-white shadow-button disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create Job
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
