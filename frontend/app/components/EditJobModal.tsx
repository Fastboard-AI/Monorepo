"use client";

import { useState, useEffect } from "react";
import { X, Pencil, MapPin, Code } from "lucide-react";
import type { Job, ExperienceLevel, JobStatus } from "../types";
import { getSkillName } from "../types";

interface EditJobModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveJob: (
    jobId: string,
    updates: {
      title?: string;
      description?: string;
      location?: string;
      requiredSkills?: string[];
      experienceLevel?: ExperienceLevel;
      status?: JobStatus;
    }
  ) => void;
}

const experienceLevels: { value: ExperienceLevel; label: string }[] = [
  { value: "any", label: "Any Level" },
  { value: "entry", label: "Entry Level (0-2 years)" },
  { value: "mid", label: "Mid Level (2-5 years)" },
  { value: "senior", label: "Senior (5-8 years)" },
  { value: "lead", label: "Lead/Principal (8+ years)" },
];

const jobStatuses: { value: JobStatus; label: string }[] = [
  { value: "sourcing", label: "Sourcing Candidates" },
  { value: "reviewing", label: "Reviewing Candidates" },
  { value: "filled", label: "Position Filled" },
  { value: "closed", label: "Closed" },
];

export function EditJobModal({
  job,
  isOpen,
  onClose,
  onSaveJob,
}: EditJobModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("any");
  const [status, setStatus] = useState<JobStatus>("sourcing");

  useEffect(() => {
    if (job) {
      setTitle(job.title);
      setDescription(job.description || "");
      setLocation(job.location || "");
      // Convert JobSkill[] to string[] for editing
      setSkills(job.requiredSkills.map(getSkillName));
      setExperienceLevel(job.experienceLevel);
      setStatus(job.status);
    }
  }, [job]);

  if (!isOpen || !job) return null;

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

    onSaveJob(job.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      requiredSkills: skills,
      experienceLevel,
      status,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
              <Pencil className="h-5 w-5 text-indigo-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Edit Job</h2>
          </div>
          <button
            onClick={onClose}
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
              htmlFor="edit-job-title"
              className="block text-sm font-medium text-slate-700"
            >
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-job-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Senior Full-Stack Developer"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="edit-job-description"
              className="block text-sm font-medium text-slate-700"
            >
              Description
            </label>
            <textarea
              id="edit-job-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the role..."
              rows={3}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Location */}
          <div>
            <label
              htmlFor="edit-job-location"
              className="block text-sm font-medium text-slate-700"
            >
              Location
            </label>
            <div className="relative mt-1.5">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="edit-job-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., San Francisco, CA"
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Required Skills */}
          <div>
            <label
              htmlFor="edit-job-skills"
              className="block text-sm font-medium text-slate-700"
            >
              Required Skills
            </label>
            <div className="relative mt-1.5">
              <Code className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="edit-job-skills"
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
              htmlFor="edit-experience-level"
              className="block text-sm font-medium text-slate-700"
            >
              Experience Level
            </label>
            <select
              id="edit-experience-level"
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

          {/* Status */}
          <div>
            <label
              htmlFor="edit-job-status"
              className="block text-sm font-medium text-slate-700"
            >
              Status
            </label>
            <select
              id="edit-job-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as JobStatus)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 py-2.5 px-4 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {jobStatuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="btn-lift rounded-lg gradient-bg px-4 py-2 text-sm font-medium text-white shadow-button disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
